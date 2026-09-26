import { del, post } from './api';

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// L'abonnement appartient à l'appareil : c'est lui qui dit si les notifications sont actives ici.
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) !== null;
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  // Le serveur est prévenu avant : sinon il continuerait d'envoyer dans le vide.
  await del('/push/subscriptions', { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}

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
  if (!pushSupported()) {
    throw new Error('Ce navigateur ne gère pas les notifications.');
  }
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications refusées. Autorisez-les dans les réglages de l\'appareil.');
  }
  const registration = await navigator.serviceWorker.ready;
  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    });
  } catch {
    // Messages du navigateur en anglais et peu parlants : navigateur non compatible,
    // service push injoignable, notifications coupées au niveau du système.
    throw new Error("Impossible d'activer les notifications sur cet appareil.");
  }
  await post('/push/subscriptions', subscription.toJSON());
}
