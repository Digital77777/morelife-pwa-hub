import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listAllOrders, updateOrderStatus } from "@/lib/admin.functions";
import { formatRand } from "@/lib/cart";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["pending", "confirmed", "out_for_delivery", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

function AdminOrders() {
  const { isAdmin } = useRoles();
  const fetchOrders = useServerFn(listAllOrders);
  const setStatus = useServerFn(updateOrderStatus);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
    enabled: isAdmin,
  });

  const change = async (id: string, status: Status) => {
    setSavingId(id);
    try {
      await setStatus({ data: { id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status updated and the member has been notified");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the order");
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading orders…</p>;

  const visible = filter === "all" ? data : data.filter((o) => o.status === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-md border px-3 py-1.5 label-caps ${
              filter === status
                ? "border-primary text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {status.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No orders in this view.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {visible.map((order) => (
            <li key={order.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{order.reference}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("en-ZA")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.member_name ?? "Member"}
                    {order.member_number ? ` · ${order.member_number}` : ""}
                  </p>
                </div>
                <p className="text-sm">{formatRand(order.total)}</p>
              </div>

              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {order.items.map((item, index) => (
                  <li key={`${order.id}-${index}`}>
                    {item.quantity} × {item.product_name} — {formatRand(item.unit_price)}
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-xs text-muted-foreground">{order.delivery_address}</p>
              {order.contact_phone && (
                <p className="text-xs text-muted-foreground">{order.contact_phone}</p>
              )}
              {order.notes && <p className="mt-1 text-xs italic">“{order.notes}”</p>}

              <label
                htmlFor={`status-${order.id}`}
                className="mt-4 block label-caps text-muted-foreground"
              >
                Status
              </label>
              <select
                id={`status-${order.id}`}
                value={order.status}
                disabled={savingId === order.id}
                onChange={(e) => void change(order.id, e.target.value as Status)}
                className="mt-1.5 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
