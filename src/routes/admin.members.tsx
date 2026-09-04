import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createMember, listMembers } from "@/lib/admin.functions";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/admin/members")({
  component: AdminMembers,
});

const EMPTY = {
  email: "",
  password: "",
  display_name: "",
  phone: "",
  delivery_address: "",
};

function AdminMembers() {
  const { isAdmin } = useRoles();
  const qc = useQueryClient();
  const fetchMembers = useServerFn(listMembers);
  const addMember = useServerFn(createMember);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-members"],
    queryFn: () => fetchMembers(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: () =>
      addMember({
        data: {
          email: form.email,
          password: form.password,
          display_name: form.display_name,
          phone: form.phone || null,
          delivery_address: form.delivery_address || null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Member created — ${res.member_number ?? "profile ready"}`);
      setForm(EMPTY);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const field = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl leading-none">Members</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md bg-primary px-4 py-2 label-caps text-primary-foreground"
        >
          {open ? "Close" : "New member"}
        </button>
      </div>

      {open && (
        <form
          className="mt-5 space-y-3 rounded-lg border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              className={field}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Temporary password
            <input
              type="text"
              required
              minLength={8}
              className={field}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Full name
            <input
              required
              className={field}
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Phone
            <input
              className={field}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Delivery address
            <textarea
              rows={2}
              className={field}
              value={form.delivery_address}
              onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
            />
          </label>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-primary px-4 py-3 label-caps text-primary-foreground disabled:opacity-60"
          >
            {mutation.isPending ? "Creating…" : "Create member"}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading members…</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {(data ?? []).map((m) => (
            <li key={m.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">{m.display_name ?? "Unnamed member"}</span>
                <span className="label-caps text-muted-foreground">{m.member_number}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.email ?? "no email"} · {m.order_count} order{m.order_count === 1 ? "" : "s"}
                {m.roles.length ? ` · ${m.roles.join(", ")}` : ""}
              </p>
              {m.delivery_address && (
                <p className="mt-1 text-xs text-muted-foreground">{m.delivery_address}</p>
              )}
            </li>
          ))}
          {(data ?? []).length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No members yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
