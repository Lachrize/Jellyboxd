/** Inline script to apply theme before paint and avoid flash. */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var key = "jellyboxd-theme";
    var stored = localStorage.getItem(key);
    var theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
