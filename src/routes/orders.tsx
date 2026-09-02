import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyOrders } from "@/lib/orders.functions";
import { formatRand } from "@/lib/cart";
import { useSession } from "@/hooks/use-session";
import { useEffect, useState } from "react";
import { subscribeToOutbox } from "@/lib/outbox";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Your Orders — More Life Members Club" },
      { name: "description", content: "Track your More Life club orders and their status." },
      { property: "og:title", content: "Your Orders — More Life" },
      { property: "og:description", content: "Track your More Life club orders." },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { session, loading } = useSession();
  const [queued, setQueued] = useState(0);

  useEffect(
    () => subscribeToOutbox((items) => setQueued(items.filter((i) => i.kind === "order").length)),
    [],
  );
  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
    enabled: !!session,
  });

  if (loading) return <div className="px-4 py-16 text-sm text-muted-foreground">Loading…</div>;

  if (!session) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="text-3xl">Your orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to see your order history.</p>
        <Link
          to="/auth"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <h1 className="text-4xl leading-none">Your orders</h1>
      {queued > 0 && (
        <p className="mt-4 rounded-md border border-gold/40 bg-card p-3 text-xs text-muted-foreground">
          {queued} order{queued === 1 ? "" : "s"} waiting to send. They&apos;ll go through
          automatically once you&apos;re back online.
        </p>
      )}
      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading your orders…</p>
      ) : !data || data.length === 0 ? (
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">No orders yet.</p>
          <Link to="/products" className="mt-3 inline-block label-caps text-primary">
            Browse the range
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {data.map((order) => (
            <li key={order.id} className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-semibold">{order.reference}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("en-ZA")} · {order.item_count} item
                  {order.item_count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">{formatRand(order.total)}</p>
                <p className="mt-1 label-caps text-primary">{order.status}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
