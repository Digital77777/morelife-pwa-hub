import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
  currentPushSubscription,
  disablePushNotifications,
  enablePushNotifications,
  notificationPermission,
  pushSupported,
} from "@/lib/push-client";
import { track } from "@/lib/analytics";

export function PushToggle() {
  const [state, setState] = useState<"checking" | "unsupported" | "off" | "on" | "blocked">(
    "checking",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!pushSupported()) return setState("unsupported");
      if (notificationPermission() === "denied") return setState("blocked");
      const sub = await currentPushSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  if (state === "checking") return null;

  if (state === "unsupported") {
    return (
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <p className="label-caps text-muted-foreground">Order alerts</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Install More Life to your home screen to receive order and delivery alerts on this device.
        </p>
      </div>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === "on") {
        await disablePushNotifications();
        track("push_disabled");
        setState("off");
        toast.success("Order alerts turned off");
      } else {
        await enablePushNotifications();
        track("push_enabled");
        setState("on");
        toast.success("Order alerts turned on");
      }
    } catch (error) {
      if (notificationPermission() === "denied") setState("blocked");
      toast.error(error instanceof Error ? error.message : "Could not update notifications");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {state === "on" ? (
          <Bell className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
        ) : (
          <BellOff className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="flex-1">
          <p className="label-caps">Order alerts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {state === "blocked"
              ? "Notifications are blocked in your browser settings. Allow them for this site to receive order updates."
              : "Get a push notification when your order is confirmed and when it's out for delivery."}
          </p>
        </div>
      </div>
      {state !== "blocked" && (
        <button
          onClick={toggle}
          disabled={busy}
          className={`mt-4 w-full rounded-md px-4 py-2.5 label-caps disabled:opacity-60 ${
            state === "on"
              ? "border border-border text-muted-foreground hover:bg-secondary"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {busy ? "Please wait…" : state === "on" ? "Turn off alerts" : "Turn on alerts"}
        </button>
      )}
    </div>
  );
}
