import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Bike, Clock } from "lucide-react";
import { getCatalog } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/ProductCard";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "More Life Members Club — Our Grass Is Always Greener" },
      {
        name: "description",
        content:
          "Cape Town's premier cannabis members club. Browse flower, pre-rolls, concentrates, edibles and more, then order straight to your door.",
      },
      { property: "og:title", content: "More Life Members Club" },
      {
        property: "og:description",
        content: "Cape Town's premier cannabis members club. Browse the range and order delivery.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Home,
  errorComponent: ({ error }) => (
    <div role="alert" className="px-4 py-16 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="px-4 py-16">Nothing here.</div>,
});

function Home() {
  const { data } = useSuspenseQuery(catalogQuery);
  const featured = (data.products.filter((p) => p.featured).length
    ? data.products.filter((p) => p.featured)
    : data.products
  ).slice(0, 6);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border px-4 py-16 text-center">
        <p className="label-caps text-primary">Cape Town · Members Only</p>
        <h1 className="mx-auto mt-4 max-w-2xl text-5xl leading-[0.95] sm:text-7xl">
          Our grass is
          <br />
          always greener
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm text-muted-foreground">
          The More Life members app. Browse the club range, build your bag and have it delivered —
          all in one place.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/products"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground sm:w-auto"
          >
            Browse the range <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/membership"
            className="inline-flex w-full items-center justify-center rounded-md border border-border px-6 py-3 label-caps sm:w-auto"
          >
            My membership
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-px border-b border-border bg-border sm:grid-cols-3">
        {[
          { icon: Bike, title: "Same-day delivery", copy: "Across the Cape Town metro." },
          { icon: BadgeCheck, title: "Curated quality", copy: "Every strain club-tested." },
          { icon: Clock, title: "Open 7 days", copy: "9am until late, every day." },
        ].map((f) => (
          <div key={f.title} className="bg-background p-5">
            <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-base">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.copy}</p>
          </div>
        ))}
      </section>

      <section className="px-4 py-10">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Shop by category</h2>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ category: c.slug }}
              className="shrink-0 rounded-full border border-border px-4 py-2 label-caps text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Members&apos; picks</h2>
          <Link to="/products" className="label-caps text-primary">
            View all
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
