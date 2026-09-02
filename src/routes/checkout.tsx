import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder } from "@/lib/orders.functions";
import { formatRand, useCart } from "@/lib/cart";
import { useSession } from "@/hooks/use-session";
import { track } from "@/lib/analytics";
import { enqueue } from "@/lib/outbox";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — More Life Members Club" },
      { name: "description", content: "Confirm your delivery details and place your club order." },
      { property: "og:title", content: "Checkout — More Life" },
      { property: "og:description", content: "Confirm delivery details and place your order." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const { session, loading } = useSession();
  const submit = useServerFn(placeOrder);
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    track("checkout_started", { items: lines.length, value: subtotal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (loading) return <div className="px-4 py-16 text-sm text-muted-foreground">Loading…</div>;

  if (!session) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="text-3xl">Members only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your membership to place an order.
        </p>
        <Link
          to="/auth"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="text-3xl">Your bag is empty</h1>
        <Link to="/products" className="mt-4 inline-block label-caps text-primary">
          Browse the range
        </Link>
      </div>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      deliveryAddress: address,
      contactPhone: phone || null,
      notes: notes || null,
    };

    if (!navigator.onLine) {
      enqueue("order", payload);
      clear();
      track("checkout_queued_offline", { items: payload.items.length, value: subtotal });
      toast.success("Saved offline — we'll send your order the moment you're back online.");
      navigate({ to: "/orders" });
      return;
    }

    setBusy(true);
    try {
      const order = await submit({ data: payload });
      clear();
      track("checkout_completed", { reference: order.reference, value: order.total });
      toast.success(`Order ${order.reference} placed`);
      navigate({ to: "/orders" });
    } catch (error) {
      if (!navigator.onLine) {
        enqueue("order", payload);
        clear();
        track("checkout_queued_offline", { items: payload.items.length, value: subtotal });
        toast.success("Saved offline — we'll send your order once you reconnect.");
        navigate({ to: "/orders" });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Could not place your order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-8">
      <h1 className="text-4xl leading-none">Checkout</h1>
      {!online && (
        <p className="mt-4 rounded-md border border-gold/40 bg-card p-3 text-xs text-muted-foreground">
          You&apos;re offline. You can still place this order — it will be sent automatically as soon
          as your connection returns.
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="address" className="label-caps text-muted-foreground">
            Delivery address
          </label>
          <textarea
            id="address"
            required
            minLength={6}
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="phone" className="label-caps text-muted-foreground">
            Contact number
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="notes" className="label-caps text-muted-foreground">
            Notes for the club
          </label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="label-caps text-muted-foreground">Total</span>
          <span className="text-2xl">{formatRand(subtotal)}</span>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Placing order…" : "Place order"}
        </button>
        <p className="text-xs text-muted-foreground">
          The club will confirm availability, delivery time and payment with you directly.
        </p>
      </form>
    </div>
  );
}
