import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteProduct,
  listAdminCatalog,
  saveProduct,
  type AdminProduct,
} from "@/lib/admin.functions";
import { formatRand } from "@/lib/cart";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Draft = Omit<AdminProduct, "id"> & { id: string | null };

const EMPTY: Draft = {
  id: null,
  slug: "",
  name: "",
  tagline: "",
  description: "",
  price: 0,
  image_url: "",
  category_id: null,
  in_stock: true,
  featured: false,
  active: true,
  sort_order: 0,
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function AdminProducts() {
  const { isAdmin } = useRoles();
  const fetchCatalog = useServerFn(listAdminCatalog);
  const save = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: () => fetchCatalog(),
    enabled: isAdmin,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      await save({
        data: {
          ...draft,
          tagline: draft.tagline || null,
          description: draft.description || null,
          image_url: draft.image_url || null,
          category_id: draft.category_id || null,
        },
      });
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Product saved");
      setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the product");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete “${name}”? This can't be undone.`)) return;
    try {
      await remove({ data: { id } });
      await refresh();
      toast.success("Product deleted");
    } catch {
      toast.error("Could not delete it — it may be linked to past orders. Deactivate it instead.");
    }
  };

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <button
        onClick={() => setDraft({ ...EMPTY, sort_order: data.products.length })}
        className="rounded-md bg-primary px-4 py-2.5 label-caps text-primary-foreground"
      >
        New product
      </button>

      {draft && (
        <form
          onSubmit={onSave}
          className="mt-5 space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <Field label="Name">
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Slug">
            <input
              required
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Tagline">
            <input
              value={draft.tagline ?? ""}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Price (ZAR)">
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Image URL">
            <input
              value={draft.image_url ?? ""}
              onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Category">
            <select
              value={draft.category_id ?? ""}
              onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}
              className={inputClass}
            >
              <option value="">No category</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              min={0}
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>

          <div className="flex flex-wrap gap-4 pt-1">
            {(
              [
                ["in_stock", "In stock"],
                ["featured", "Featured"],
                ["active", "Visible in shop"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-md bg-primary px-4 py-2.5 label-caps text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-md border border-border px-4 py-2.5 label-caps text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="mt-6 divide-y divide-border border-y border-border">
        {data.products.map((product) => (
          <li key={product.id} className="flex items-center gap-3 py-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-surface">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{product.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatRand(product.price)}
                {product.active ? "" : " · hidden"}
                {product.in_stock ? "" : " · out of stock"}
                {product.featured ? " · featured" : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setDraft({ ...product })}
                className="label-caps text-primary"
              >
                Edit
              </button>
              <button
                onClick={() => void onDelete(product.id, product.name)}
                className="label-caps text-destructive"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
