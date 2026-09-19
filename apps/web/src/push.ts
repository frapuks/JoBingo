import { post } from './api';

// Sur iPhone, les notifications n'existent QUE pour une app installée sur l'écran
// d'accueil : dans Safari, PushManager est absent et aucune demande n'est possible.
export function isIosOutsideHomeScreen(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function subscribeToPush(publicKey: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Ce navigateur ne gère pas les notifications.');
  }
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications refusées. Autorisez-les dans les réglages de l\'appareil.');
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(publicKey),
  });
  await post('/push/subscriptions', subscription.toJSON());
}
