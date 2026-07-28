import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Club — More Life Members Club" },
      {
        name: "description",
        content: "More Life is a members-only cannabis club in Cape Town. Our grass is always greener.",
      },
      { property: "og:title", content: "About the Club — More Life" },
      { property: "og:description", content: "A members-only cannabis club in Cape Town." },
    ],
  }),
  component: () => (
    <div className="px-4 py-10">
      <h1 className="text-4xl leading-none">About the club</h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          More Life is a members-only cannabis club in Cape Town. We curate a tight, tested range —
          flower, pre-rolls, concentrates, edibles, drinks and the essentials — for members who care
          about quality over quantity.
        </p>
        <p>
          Membership is free and issued instantly when you create your account. You must be 18 or
          older to join, and everything shared here stays between the club and its members.
        </p>
        <p className="font-display text-2xl uppercase text-foreground">
          Our grass is always greener.
        </p>
      </div>
    </div>
  ),
});
