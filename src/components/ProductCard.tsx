import { Link } from "@tanstack/react-router";
import { formatRand } from "@/lib/cart";
import type { CatalogProduct } from "@/lib/catalog.functions";

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="group block overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary/60"
    >
      <div className="aspect-square overflow-hidden bg-surface">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center label-caps text-muted-foreground">
            More Life
          </div>
        )}
      </div>
      <div className="p-3">
        {product.category_name && (
          <p className="label-caps text-primary">{product.category_name}</p>
        )}
        <h3 className="mt-1 text-base leading-tight">{product.name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{formatRand(product.price)}</p>
      </div>
    </Link>
  );
}
