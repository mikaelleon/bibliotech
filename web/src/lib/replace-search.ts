/** Updates the query string without a Next.js navigation, so the page stays where it was scrolled. */
export function replaceSearch(changes: Record<string, string | null | undefined>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(window.history.state, "", url);
}
