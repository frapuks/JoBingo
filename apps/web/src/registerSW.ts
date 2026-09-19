// iOS ne recharge pas une app installée quand on y revient : elle reprend telle quelle,
// parfois des jours plus tard. Au retour au premier plan, on compare donc le build en
// mémoire avec celui publié ; s'il a changé, on recharge pour prendre la nouvelle version.
async function reloadIfNewVersion(): Promise<void> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    const { build } = (await res.json()) as { build?: string };
    if (build && build !== __BUILD_ID__) window.location.reload();
  } catch {
    // Hors ligne : on vérifiera au prochain retour.
  }
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('Service worker :', err));
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration().then((registration) => registration?.update());
    reloadIfNewVersion();
  });
}
