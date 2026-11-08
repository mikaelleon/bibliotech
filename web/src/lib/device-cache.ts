/** Drop the service-worker caches for this site. Called on log out so the next person does not see the previous pages. */
export async function clearAppCache(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith("elib-")).map((key) => caches.delete(key)));
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  registration?.active?.postMessage("clear-shell");
}
