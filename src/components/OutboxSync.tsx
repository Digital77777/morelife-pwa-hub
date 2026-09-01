import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { placeOrder } from "@/lib/orders.functions";
import { sendAnalyticsPayload, type AnalyticsPayload } from "@/lib/analytics";
import { outboxItems, setOutboxHandlers, startOutboxSync, subscribeToOutbox } from "@/lib/outbox";

type QueuedOrder = Parameters<typeof placeOrder>[0]["data"];

/**
 * Registers the offline outbox handlers and keeps them flushing whenever the
 * device regains connectivity. Renders nothing.
 */
export function OutboxSync() {
  const submitOrder = useServerFn(placeOrder);
  const queryClient = useQueryClient();

  useEffect(() => {
    setOutboxHandlers({
      analytics: async (payload) => {
        await sendAnalyticsPayload(payload as AnalyticsPayload);
      },
      order: async (payload) => {
        const order = await submitOrder({ data: payload as QueuedOrder });
        toast.success(`Queued order ${order.reference} was sent through`);
        void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      },
    });

    let previousOrders = outboxItems().filter((i) => i.kind === "order").length;
    const unsubscribe = subscribeToOutbox((items) => {
      const orders = items.filter((i) => i.kind === "order").length;
      previousOrders = orders;
    });

    const stop = startOutboxSync();
    return () => {
      unsubscribe();
      stop();
      void previousOrders;
    };
  }, [submitOrder, queryClient]);

  return null;
}
