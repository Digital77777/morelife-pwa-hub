import { buildPushPayload } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PushMessageBody = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Sends a web push message to every device a member has registered.
 * Endpoints rejected by the push service (410/404) are pruned.
 */
export async function sendPushToUser(userId: string, message: PushMessageBody) {
  const vapid = {
    subject: process.env["VAPID_SUBJECT"],
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };

  if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) {
    console.warn("[push] VAPID keys are not configured; skipping send");
    return { sent: 0 };
  }

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error("[push] could not load subscriptions", error.message);
    return { sent: 0 };
  }

  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        const payload = await buildPushPayload(
          { data: message, options: { ttl: 60 * 60 * 12, urgency: "high" } },
          subscription,
          vapid,
        );
        const res = await fetch(sub.endpoint, {
          method: payload.method,
          headers: payload.headers,
          body: payload.body as unknown as BodyInit,
        });
        if (res.status === 404 || res.status === 410) {
          stale.push(sub.endpoint);
        } else if (res.ok) {
          sent += 1;
        } else {
          console.error("[push] push service rejected", res.status, await res.text());
        }
      } catch (err) {
        console.error("[push] send failed", err);
      }
    }),
  );

  if (stale.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return { sent };
}
