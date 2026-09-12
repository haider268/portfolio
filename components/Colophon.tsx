import Anchor from "./Anchor";

export default function Colophon() {
  return (
    <footer className="colophon">
      <p className="colophon__line">
        Haider Ali · Pakistan · works across timezones
        <br />
        <span>
          The agent on this site reads the same files that render these pages.
        </span>
      </p>
      <p className="colophon__links">
        <a href="mailto:haiderali2689832@gmail.com">haiderali2689832@gmail.com</a>
        <Anchor href="https://www.linkedin.com/in/haiderali514">linkedin.com/in/haiderali514</Anchor>
        <Anchor href="https://github.com/haider268">github.com/haider268</Anchor>
      </p>
      {/* Domain is parked. When it is chosen, this file and the metadataBase
          in app/layout.tsx are the only two places that change. */}
    </footer>
  );
}
