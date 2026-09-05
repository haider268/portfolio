"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/* The inline script in the root layout has already put the stored theme on
   <html> before paint. This only has to keep the label honest afterwards. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = document.documentElement.dataset.theme as Theme | undefined;
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      return;
    }
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  function flip() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: the choice just does not survive the session */
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={flip}
      aria-label={
        theme === null
          ? "Switch colour theme"
          : `Switch to ${theme === "dark" ? "light" : "dark"} theme`
      }
    >
      {/* Rendered empty on the server so it cannot disagree with the client. */}
      {theme === null ? " " : theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
