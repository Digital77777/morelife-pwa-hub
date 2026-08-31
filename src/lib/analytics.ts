import { supabase } from "@/integrations/supabase/client";
import { enqueue, flushOutbox } from "./outbox";

export type AnalyticsEventName =
  | "age_gate_shown"
  | "age_gate_confirmed"
  | "age_gate_declined"
  | "product_viewed"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_started"
  | "checkout_completed"
  | "checkout_queued_offline"
  | "membership_signup"
  | "membership_signin"
  | "push_enabled"
  | "push_disabled";

const SESSION_KEY = "morelife.analytics.session";

function sessionId() {
  if (typeof window === "undefined") return null;
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export type AnalyticsPayload = {
  event: AnalyticsEventName;
  props: Record<string, unknown>;
  path: string | null;
  session_id: string | null;
  user_id: string | null;
};

export async function sendAnalyticsPayload(payload: AnalyticsPayload) {
  const { error } = await supabase.from("analytics_events").insert({
    event: payload.event,
    props: payload.props as never,
    path: payload.path,
    session_id: payload.session_id,
    user_id: payload.user_id,
  });
  if (error) throw new Error(error.message);
}

/** Fire-and-forget event tracking. Queues offline and replays on reconnect. */
export function track(event: AnalyticsEventName, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  void (async () => {
    const { data } = await supabase.auth.getSession();
    const payload: AnalyticsPayload = {
      event,
      props,
      path: window.location.pathname,
      session_id: sessionId(),
      user_id: data.session?.user.id ?? null,
    };

    if (navigator.onLine === false) {
      enqueue("analytics", payload);
      return;
    }

    try {
      await sendAnalyticsPayload(payload);
    } catch {
      enqueue("analytics", payload);
      void flushOutbox();
    }
  })();
}
