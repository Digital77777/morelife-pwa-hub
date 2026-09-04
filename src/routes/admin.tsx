import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Club Admin — More Life Members Club" },
      { name: "description", content: "Manage the More Life catalogue, categories and orders." },
      { property: "og:title", content: "Club Admin — More Life" },
      { property: "og:description", content: "Manage the More Life catalogue and orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const LINKS = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/orders", label: "Orders", exact: false },
  { to: "/admin/products", label: "Products", exact: false },
  { to: "/admin/categories", label: "Categories", exact: false },
  { to: "/admin/members", label: "Members", exact: false },
] as const;

function AdminLayout() {
  const { session, loading, isAdmin } = useRoles();

  if (loading) return <div className="px-4 py-16 text-sm text-muted-foreground">Loading…</div>;

  if (!session) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="text-3xl">Club admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with your admin account.</p>
        <Link
          to="/auth"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="text-3xl">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your club licence key to unlock the admin panel.
        </p>
        <Link
          to="/admin/access"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground"
        >
          Enter licence key
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <h1 className="text-4xl leading-none">Club admin</h1>
      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: link.exact }}
            className="whitespace-nowrap rounded-md border border-border px-3 py-2 label-caps text-muted-foreground"
            activeProps={{ className: "border-primary text-primary" }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
