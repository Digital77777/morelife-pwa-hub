import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { getProductBySlug } from "@/lib/catalog.functions";
import { formatRand, useCart } from "@/lib/cart";
import { ProductCard } from "@/components/ProductCard";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!result.product) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.product) {
      return {
        meta: [{ title: "Product unavailable — More Life" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.product;
    const description = p.tagline ?? p.description ?? `${p.name} from More Life Members Club.`;
    return {
      meta: [
        { title: `${p.name} — More Life Members Club` },
        { name: "description", content: description },
        { property: "og:title", content: `${p.name} — More Life` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductDetail,
  errorComponent: ({ error }) => (
    <div role="alert" className="px-4 py-16 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="px-4 py-16 text-center">
      <h1 className="text-3xl">Product not found</h1>
      <Link to="/products" className="mt-4 inline-block label-caps text-primary">
        Back to the shop
      </Link>
    </div>
  ),
});

function ProductDetail() {
  const { product, related } = useSuspenseQuery(productQuery(Route.useParams().slug)).data;
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const addToBag = () => {
    cart.add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      },
      quantity,
    );
    setAdded(true);
    toast.success(`${product.name} added to your bag`);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-5">
        <Link to="/products" className="inline-flex items-center gap-2 label-caps text-muted-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>
      </div>

      <div className="mt-4 grid gap-6 px-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              width={800}
              height={800}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center label-caps text-muted-foreground">
              More Life
            </div>
          )}
        </div>

        <div>
          {product.category_name && (
            <Link
              to="/products"
              search={{ category: product.category_slug ?? undefined }}
              className="label-caps text-primary"
            >
              {product.category_name}
            </Link>
          )}
          <h1 className="mt-2 text-4xl leading-none">{product.name}</h1>
          {product.tagline && <p className="mt-2 text-sm text-muted-foreground">{product.tagline}</p>}
          <p className="mt-5 text-2xl">{formatRand(product.price)}</p>

          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {product.in_stock ? (
            <div className="mt-7 flex items-center gap-3">
              <div className="flex items-center rounded-md border border-border">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="px-4 py-3 text-lg leading-none"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  aria-label="Increase quantity"
                  className="px-4 py-3 text-lg leading-none"
                >
                  +
                </button>
              </div>
              <button
                onClick={addToBag}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" /> Added
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Add to bag
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="mt-7 rounded-md border border-border px-4 py-3 label-caps text-muted-foreground">
              Currently out of stock
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12 px-4">
          <h2 className="text-2xl">You might also like</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
