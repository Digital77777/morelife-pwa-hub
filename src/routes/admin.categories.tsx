import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { deleteCategory, listAdminCatalog, saveCategory } from "@/lib/admin.functions";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

type Draft = {
  id: string | null;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
};

const EMPTY: Draft = { id: null, slug: "", name: "", description: "", sort_order: 0 };

function AdminCategories() {
  const { isAdmin } = useRoles();
  const fetchCatalog = useServerFn(listAdminCatalog);
  const save = useServerFn(saveCategory);
  const remove = useServerFn(deleteCategory);
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
          id: draft.id,
          slug: draft.slug,
          name: draft.name,
          description: draft.description || null,
          sort_order: draft.sort_order,
        },
      });
      await refresh();
      toast.success("Category saved");
      setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the category");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete “${name}”? Products keep existing but lose this category.`)) return;
    try {
      await remove({ data: { id } });
      await refresh();
      toast.success("Category deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the category");
    }
  };

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <button
        onClick={() => setDraft({ ...EMPTY, sort_order: data.categories.length })}
        className="rounded-md bg-primary px-4 py-2.5 label-caps text-primary-foreground"
      >
        New category
      </button>

      {draft && (
        <form onSubmit={onSave} className="mt-5 space-y-3 rounded-lg border border-border bg-card p-4">
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
          <Field label="Description">
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className={inputClass}
            />
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
        {data.categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-semibold">{category.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">/{category.slug}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setDraft({
                    id: category.id,
                    slug: category.slug,
                    name: category.name,
                    description: category.description ?? "",
                    sort_order: category.sort_order,
                  })
                }
                className="label-caps text-primary"
              >
                Edit
              </button>
              <button
                onClick={() => void onDelete(category.id, category.name)}
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
