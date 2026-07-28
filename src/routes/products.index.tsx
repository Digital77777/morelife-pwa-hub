import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCatalog } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/ProductCard";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 5 * 60_000,
});

type Search = { category?: string };

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop the Range — More Life Members Club" },
      {
        name: "description",
        content:
          "Flower, pre-rolls, concentrates, edibles, drinks and essentials from the More Life members club in Cape Town.",
      },
      { property: "og:title", content: "Shop the Range — More Life" },
      {
        property: "og:description",
        content: "Browse flower, pre-rolls, concentrates, edibles and more from More Life.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Products,
  errorComponent: ({ error }) => (
    <div role="alert" className="px-4 py-16 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="px-4 py-16">No products found.</div>,
});

function Products() {
  const { data } = useSuspenseQuery(catalogQuery);
  const { category } = Route.useSearch();
  const navigate = useNavigate();

  const products = category
    ? data.products.filter((p) => p.category_slug === category)
    : data.products;

  const setCategory = (value?: string) =>
    navigate({ to: "/products", search: { category: value } });

  return (
    <div className="px-4 py-8">
      <h1 className="text-4xl leading-none">Shop the range</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {products.length} product{products.length === 1 ? "" : "s"} available to members.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setCategory(undefined)}
          className={`shrink-0 rounded-full border px-4 py-2 label-caps transition-colors ${
            !category
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground"
          }`}
        >
          All
        </button>
        {data.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.slug)}
            className={`shrink-0 rounded-full border px-4 py-2 label-caps transition-colors ${
              category === c.slug
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">Nothing in this category right now.</p>
          <Link to="/products" className="mt-3 inline-block label-caps text-primary">
            See everything
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
