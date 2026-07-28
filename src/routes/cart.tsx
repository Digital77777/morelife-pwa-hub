import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { formatRand, useCart } from "@/lib/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Bag — More Life Members Club" },
      { name: "description", content: "Review your More Life bag and send your order through." },
      { property: "og:title", content: "Your Bag — More Life" },
      { property: "og:description", content: "Review your More Life bag before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, setQuantity, remove } = useCart();

  return (
    <div className="px-4 py-8">
      <h1 className="text-4xl leading-none">Your bag</h1>

      {lines.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">Your bag is empty.</p>
          <Link
            to="/products"
            className="mt-5 inline-block rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {lines.map((line) => (
              <li key={line.productId} className="flex gap-3 py-4">
                <Link
                  to="/products/$slug"
                  params={{ slug: line.slug }}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface"
                >
                  {line.image_url && (
                    <img
                      src={line.image_url}
                      alt={line.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{line.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatRand(line.price)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-border">
                      <button
                        onClick={() => setQuantity(line.productId, line.quantity - 1)}
                        aria-label={`Decrease ${line.name}`}
                        className="px-3 py-1.5"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm">{line.quantity}</span>
                      <button
                        onClick={() => setQuantity(line.productId, line.quantity + 1)}
                        aria-label={`Increase ${line.name}`}
                        className="px-3 py-1.5"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => remove(line.productId)}
                      aria-label={`Remove ${line.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="text-sm">{formatRand(line.price * line.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <span className="label-caps text-muted-foreground">Subtotal</span>
            <span className="text-2xl">{formatRand(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Delivery is arranged and confirmed by the club after you place your order. Payment is
            settled on delivery or collection.
          </p>

          <Link
            to="/checkout"
            className="mt-6 flex w-full items-center justify-center rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground"
          >
            Continue to checkout
          </Link>
        </>
      )}
    </div>
  );
}
