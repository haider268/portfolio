import { systemPrompt } from "@/lib/agent/prompt";
import { dispatch } from "@/lib/agent/tools";
import { search } from "@/lib/agent/corpus";
import { sentences } from "@/lib/agent/speech";
import { checkLimits, clientIp, MAX_TOOL_HOPS } from "@/lib/agent/limits";
import { provider, turn, type Msg } from "@/lib/agent/llm";

/* The agent endpoint.

   Text in, tool loop, sentence-chunked text out over Server-Sent Events. The
   browser owns speech recognition and synthesis, which is why there is no
   WebSocket here and why this costs nothing to host: the server only ever
   moves text.

   The transcript lives in the browser and is posted back each turn, so this
   route holds no session state — which is also what makes it safe to run on a
   platform that may hand the next request to a different instance. */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Turn = { role: "user" | "model"; text: string };

function sse(event: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(req: Request) {
  let payload: { text?: string; history?: Turn[]; tz?: string; path?: string };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "expected JSON" }, { status: 400 });
  }

  const text = (payload.text ?? "").trim().slice(0, 600);
  const history = (payload.history ?? []).slice(-12);
  if (!text) return Response.json({ error: "empty message" }, { status: 400 });

  const ip = clientIp(req);
  /* The visitor's own IANA zone, sent by the browser. Every time the agent
     quotes is rendered on their clock — which is the thing this site is about. */
  const tz = typeof payload.tz === "string" ? payload.tz.slice(0, 64) : "";
  /* where the visitor currently is, so "summarise this page" has a referent */
  const path =
    typeof payload.path === "string" && /^\/[a-z0-9\-/]*$/i.test(payload.path)
      ? payload.path.slice(0, 80)
      : undefined;
  const verdict = checkLimits(ip, history.filter((h) => h.role === "user").length);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(sse(e));
      const finish = (reply: string) => {
        for (const s of sentences(reply)) send({ type: "chunk", text: s });
        send({ type: "done", text: reply });
        controller.close();
      };

      if (!verdict.allowed) {
        send({ type: "limited" });
        finish(verdict.reason);
        return;
      }

      // No key configured: fall back to searching the corpus directly. The
      // visitor still sees a tool fire and gets a real answer out of the same
      // content — a degraded path, never a dead button.
      if (provider() === "none") {
        groundedFallback(text, send, finish);
        return;
      }

      const msgs: Msg[] = [
        ...history.map((h) => ({ role: h.role, text: h.text }) as Msg),
        { role: "user", text },
      ];

      try {
        for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
          const result = await turn(
            systemPrompt(tz, path, history.filter((h) => h.role === "user").length),
            msgs,
            req.signal
          );

          if (!result.calls?.length) {
            finish(result.text?.trim() || "Sorry — could you say that again?");
            return;
          }

          msgs.push({ role: "calls", calls: result.calls, raw: result.raw });
          for (const call of result.calls) {
            const started = Date.now();
            const out = await dispatch(call.name, call.args, { tz, ip, signal: req.signal });
            // the visitor watches this fire before the answer arrives — and
            // the system map lights the documents the search actually found
            const hits = Array.isArray(out.hits)
              ? (out.hits as { slug?: unknown }[])
                  .map((h) => h?.slug)
                  .filter((s): s is string => typeof s === "string")
              : undefined;
            send({
              type: "tool",
              name: call.name,
              args: call.args,
              ok: out.ok,
              hits,
              // a successful open_page carries the path; the browser follows it
              path: call.name === "open_page" && typeof out.path === "string" ? out.path : undefined,
              ms: Date.now() - started,
              // the draft the visitor still has to send themselves — the agent
              // is told to say so, and this is the link that makes it true
              send_url: typeof out.send_url === "string" ? out.send_url : undefined,
              reference: typeof out.reference === "string" ? out.reference : undefined,
            });
            msgs.push({ role: "tool", id: call.id, name: call.name, result: out });
          }
        }

        // ran out of hops: hand over rather than keep a visitor waiting
        finish(
          "I am going round in circles on that one. Email haiderali2689832@gmail.com and I will answer it directly."
        );
      } catch (e) {
        if (req.signal.aborted) {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }
        send({ type: "degraded", message: e instanceof Error ? e.message : "upstream error" });
        groundedFallback(text, send, finish);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
    },
  });
}

/** The path with no model in it: search the corpus, report what was found.
    Stiffer than a generated reply and entirely truthful, which is the right
    way round for a fallback.

    One intent it must still understand without a model: booking. A visitor
    saying "book a call" is not asking about the corpus — the fallback opens
    the manual booking panel, which needs no model at all. */
function groundedFallback(
  text: string,
  send: (e: unknown) => void,
  finish: (reply: string) => void
) {
  if (/\b(book|appointment|meeting|schedule|calend[ae]r|call with|talk to|speak (to|with))\b/i.test(text)) {
    send({
      type: "tool",
      name: "open_page",
      args: { target: "contact" },
      ok: true,
      path: "/contact",
      ms: 0,
    });
    finish(
      "I have opened the booking page for you — pick any open slot and the calendar invitation lands in both our inboxes. Prefer email? haiderali2689832@gmail.com reaches me directly."
    );
    return;
  }

  const started = Date.now();
  const hits = search(text, 2);
  send({
    type: "tool",
    name: "search_experience",
    args: { query: text },
    ok: true,
    hits: hits.map((h) => h.slug),
    ms: Date.now() - started,
  });

  if (hits.length === 0) {
    finish(
      "I could not find anything on that. Email haiderali2689832@gmail.com and I will answer it directly."
    );
    return;
  }

  const lead = hits[0]!;
  finish(`The closest thing I have written on that is ${lead.title}. ${lead.summary}`);
}
