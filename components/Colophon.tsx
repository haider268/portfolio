export default function Colophon() {
  return (
    <footer className="colophon">
      <p>
        Haider Ali · Pakistan · works across timezones
        <br />
        Set in Newsreader and IBM Plex Mono. Built with Next.js.
      </p>
      <p className="colophon__links">
        <a href="mailto:haiderali2689832@gmail.com">haiderali2689832@gmail.com</a>
        <a href="https://www.linkedin.com/in/haiderali514" rel="me noopener">
          linkedin.com/in/haiderali514
        </a>
      </p>
      {/* TODO(haider): domain is parked. When it is chosen this line, the
          metadataBase in app/layout.tsx, and nothing else, need to change. */}
      <p className="colophon__todo">To come — a domain</p>
    </footer>
  );
}
