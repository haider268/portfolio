# Material-system transform for the palette branches. Run from repo root:
#   python scripts/_mat.py <mineral|cobalt|steel>
# Applies: branch colors (tokens, component literals, Three constants, glow,
# grounds, surface tints, themeColor), a shared intensity pass so chroma
# survives the dark ground, and branch-specific material extras.
import sys

CSS = "app/globals.css"
MAP = "components/three/SystemMap.tsx"
LAY = "app/layout.tsx"

SPECS = {
    "mineral": dict(
        sys="#56a69d", sys_bright="#8fd1c6", sys_deep="#2f6b66", sys_tri="86 166 157",
        work="#c58b58", work_dim="#765039", work_bright="#e0ae73", work_tri="197 139 88",
        bg0="#090c0b", bg1="#0d1210", bg2="#121815", radial="#0d1311",
        frame="9 12 11", panel="11 15 13", veil="7 10 9", log="10 13 12",
        dust="#7fb5ad", edge_work="#2f6b66",
        glow_bright="143,209,198", glow_base="86,166,157",
    ),
    "cobalt": dict(
        sys="#5578c8", sys_bright="#8fa9f2", sys_deep="#2c4380", sys_tri="85 120 200",
        work="#c9a35e", work_dim="#72582f", work_bright="#e4c77f", work_tri="201 163 94",
        bg0="#08090e", bg1="#0c0e15", bg2="#11141c", radial="#0d1017",
        frame="8 10 15", panel="10 12 18", veil="6 8 12", log="9 11 16",
        dust="#8f9fd0", edge_work="#8a6f38",   # brass structural wiring
        glow_bright="143,169,242", glow_base="85,120,200",
    ),
    "steel": dict(
        sys="#7189b8", sys_bright="#a6b9e0", sys_deep="#394b70", sys_tri="113 137 184",
        work="#d2ad72", work_dim="#765b34", work_bright="#e7cb94", work_tri="210 173 114",
        bg0="#0b090d", bg1="#100d12", bg2="#151217", radial="#120e14",
        frame="11 9 13", panel="13 11 16", veil="9 7 10", log="12 10 15",
        dust="#93a3c6", edge_work="#394b70",
        glow_bright="166,185,224", glow_base="113,137,184",
    ),
}

def sub(path, pairs, must=()):
    s = open(path, encoding="utf8").read()
    for a in must:
        assert a in s, f"{path}: missing anchor {a!r}"
    for a, b in pairs:
        s = s.replace(a, b)
    open(path, "w", encoding="utf8", newline="\n").write(s)

k = SPECS[sys.argv[1]]

# ── colors: CSS tokens + every component-level literal ──────────────────
sub(CSS, [
    ("#0a0b0e", k["bg0"]), ("#0e1014", k["bg1"]), ("#14161c", k["bg2"]),
    ("#0d0f16", k["radial"]),
    ("#8b95e6", k["sys"]), ("#adb5f2", k["sys_bright"]), ("#5a63b8", k["sys_deep"]),
    ("139 149 230", k["sys_tri"]),
    ("#dfc493", k["work"]), ("#a8905e", k["work_dim"]),
    ("223 196 147", k["work_tri"]),
    ("10 11 14", k["frame"]), ("12 13 18", k["panel"]),
    ("8 9 12", k["veil"]), ("11 12 16", k["log"]),
])

# ── colors: Three.js mirrors ─────────────────────────────────────────────
sub(MAP, [
    ('#8b95e6', k["sys"]), ('#adb5f2', k["sys_bright"]), ('#5a63b8', k["sys_deep"]),
    ('#dfc493', k["work"]), ('#ecdcb0', k["work_bright"]), ('#aab2e8', k["dust"]),
    ("173,181,242", k["glow_bright"]), ("139,149,230", k["glow_base"]),
], must=['#ecdcb0'])
# EDGE_WORK diverges after the generic sub (which set it to sys_deep)
sub(MAP, [
    (f'const EDGE_WORK = new THREE.Color("{k["sys_deep"]}");',
     f'const EDGE_WORK = new THREE.Color("{k["edge_work"]}");'),
])

sub(LAY, [('themeColor: "#0a0b0e"', f'themeColor: "{k["bg0"]}"')])

# ── shared intensity pass: chroma must survive the dark ground ───────────
sub(MAP, [
    ("rgba(%s,0.85)" % k["glow_bright"], "rgba(%s,0.95)" % k["glow_bright"]),
    ("rgba(%s,0.22)" % k["glow_base"], "rgba(%s,0.30)" % k["glow_base"]),
    ("h.glow.opacity = 0.16 + hot * 0.4 + flared * 0.62;",
     "h.glow.opacity = 0.20 + hot * 0.5 + flared * 0.7;"),
    ("h.wire.opacity = 0.34 + hot * 0.5 + flared * 0.6;",
     "h.wire.opacity = 0.46 + hot * 0.5 + flared * 0.6;"),
    (": p.kind === \"work\" ? AMBER : IRIS);",
     ": p.kind === \"work\" ? AMBER_BRIGHT : IRIS_BRIGHT);"),
    ("baseEdges.current.opacity = 0.1 + CORE_ENERGY[sys.phase] * 0.06;",
     "baseEdges.current.opacity = 0.15 + CORE_ENERGY[sys.phase] * 0.08;"),
    ("workEdges.current.opacity = 0.1 + CORE_ENERGY[sys.phase] * 0.06;",
     "workEdges.current.opacity = 0.13 + CORE_ENERGY[sys.phase] * 0.08;"),
    ("<lineBasicMaterial color={IRIS_BRIGHT} transparent opacity={0.55}",
     "<lineBasicMaterial color={IRIS_BRIGHT} transparent opacity={0.75}"),
    ("beamMat.current.opacity = Math.max(0, 0.65 * (1 - beamAge));",
     "beamMat.current.opacity = Math.max(0, 0.85 * (1 - beamAge));"),
    ("ringMat.current.opacity = 0.45 * (1 - since / 1.1);",
     "ringMat.current.opacity = 0.6 * (1 - since / 1.1);"),
    ("0.26 + CORE_ENERGY[sys.phase] * 0.5,",
     "0.30 + CORE_ENERGY[sys.phase] * 0.55,"),
    ("transparent opacity={0.7} depthWrite={false}",
     "transparent opacity={0.8} depthWrite={false}"),
    ("transparent opacity={0.5} depthWrite={false}",
     "transparent opacity={0.6} depthWrite={false}"),
    ("opacity={0.4}", "opacity={0.52}"),
    ("opacity={0.55}", "opacity={0.62}"),
], must=["h.glow.opacity = 0.16"])

# pip/node shadows: brighter islands of material
sub(CSS, [
    (f"rgb({k['sys_tri']} / 70%)", f"rgb({k['sys_tri']} / 85%)"),
    (f"rgb({k['sys_tri']} / 60%)", f"rgb({k['sys_tri']} / 75%)"),
    (f"rgb({k['work_tri']} / 60%)", f"rgb({k['work_tri']} / 75%)"),
])

print(f"material system applied: {sys.argv[1]}")
