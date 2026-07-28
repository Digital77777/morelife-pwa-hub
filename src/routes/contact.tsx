import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — More Life Members Club" },
      { name: "description", content: "Get in touch with the More Life members club in Cape Town." },
      { property: "og:title", content: "Contact — More Life" },
      { property: "og:description", content: "Get in touch with the More Life members club." },
    ],
  }),
  component: () => (
    <div className="px-4 py-10">
      <h1 className="text-4xl leading-none">Contact</h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>Questions about an order, delivery or your membership? Reach the club directly.</p>
        <p>
          <a
            className="text-primary underline underline-offset-4"
            href="https://www.morelifemembers.co.za/"
            target="_blank"
            rel="noreferrer"
          >
            morelifemembers.co.za
          </a>
        </p>
        <p>Cape Town, South Africa · Open daily 9:00 until late.</p>
      </div>
    </div>
  ),
});
