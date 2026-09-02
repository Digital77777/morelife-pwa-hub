import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { placeOrder } from "@/lib/orders.functions";
import { sendAnalyticsPayload, type AnalyticsPayload } from "@/lib/analytics";
import { setOutboxHandlers, startOutboxSync } from "@/lib/outbox";

export type QueuedOrder = {
  items: { productId: string; quantity: number }[];
  deliveryAddress: string;
  contactPhone: string | null;
  notes: string | null;
};

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

    return startOutboxSync();
  }, [submitOrder, queryClient]);

  return null;
}
