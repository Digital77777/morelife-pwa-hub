import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery & Service — More Life Members Club" },
      {
        name: "description",
        content: "How More Life delivery works across the Cape Town metro, plus collection times.",
      },
      { property: "og:title", content: "Delivery & Service — More Life" },
      { property: "og:description", content: "How More Life delivery and collection works." },
    ],
  }),
  component: () => (
    <div className="px-4 py-10">
      <h1 className="text-4xl leading-none">Delivery &amp; service</h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          We deliver across the Cape Town metro seven days a week. Place your order in the app and
          the club confirms availability, timing and payment with you directly.
        </p>
        <div>
          <h2 className="text-lg text-foreground">Hours</h2>
          <p className="mt-2">Monday to Sunday, 9:00 until late.</p>
        </div>
        <div>
          <h2 className="text-lg text-foreground">Collection</h2>
          <p className="mt-2">
            Prefer to collect? Mention it in the order notes and we&apos;ll have your bag ready at
            the club.
          </p>
        </div>
        <div>
          <h2 className="text-lg text-foreground">Payment</h2>
          <p className="mt-2">Settled on delivery or collection. No card details are stored.</p>
        </div>
      </div>
    </div>
  ),
});
