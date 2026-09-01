import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAnalyticsSummary } from "@/lib/admin.functions";
import { formatRand } from "@/lib/cart";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

const LABELS: Record<string, string> = {
  age_gate_shown: "Age gate shown",
  age_gate_confirmed: "Age confirmed",
  age_gate_declined: "Age declined",
  product_viewed: "Product views",
  add_to_cart: "Added to bag",
  remove_from_cart: "Removed from bag",
  checkout_started: "Checkout started",
  checkout_completed: "Checkout completed",
  checkout_queued_offline: "Checkout queued offline",
  membership_signup: "Membership signups",
  membership_signin: "Member sign-ins",
  push_enabled: "Alerts turned on",
  push_disabled: "Alerts turned off",
};

function AdminOverview() {
  const { isAdmin } = useRoles();
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => fetchSummary(),
    enabled: isAdmin,
  });

  if (isLoading || !data)
    return <p className="text-sm text-muted-foreground">Loading the last 30 days…</p>;

  const peak = Math.max(1, ...data.daily.map((d) => d.count));

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Members", value: String(data.memberCount) },
          { label: "Orders (30d)", value: String(data.orderCount) },
          { label: "Value (30d)", value: formatRand(data.revenue) },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <p className="label-caps text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-xl leading-none">{card.value}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-8 label-caps text-muted-foreground">Events, last 30 days</h3>
      {data.totals.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No events tracked yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {data.totals.map((row) => (
            <li key={row.event} className="flex items-center justify-between py-3 text-sm">
              <span>{LABELS[row.event] ?? row.event}</span>
              <span className="tabular-nums text-muted-foreground">{row.count}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-8 label-caps text-muted-foreground">Daily activity</h3>
      <div className="mt-3 flex h-28 items-end gap-1">
        {data.daily.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.count}`}
            className="flex-1 rounded-t bg-primary/70"
            style={{ height: `${Math.max(4, (d.count / peak) * 100)}%` }}
          />
        ))}
      </div>
      {data.daily.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Nothing recorded yet.</p>
      )}
    </div>
  );
}
