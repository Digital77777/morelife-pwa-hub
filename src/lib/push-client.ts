import { getPushPublicKey, savePushSubscription, removePushSubscription } from "./push.functions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

async function readyRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.ready;
}

export async function currentPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications() {
  if (!pushSupported()) throw new Error("This device doesn't support push notifications.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const { publicKey } = await getPushPublicKey();
  if (!publicKey) throw new Error("Push notifications aren't configured yet.");

  const registration = await readyRegistration();
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    }));

  const json = subscription.toJSON();
  await savePushSubscription({
    data: {
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      userAgent: navigator.userAgent.slice(0, 300),
    },
  });

  return subscription;
}

export async function disablePushNotifications() {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});
  await removePushSubscription({ data: { endpoint } });
}
