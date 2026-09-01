import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { claimAdminAccess } from "@/lib/admin.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/admin/access")({
  head: () => ({
    meta: [
      { title: "Unlock Admin — More Life Members Club" },
      { name: "description", content: "Redeem your club licence key to unlock admin tools." },
      { property: "og:title", content: "Unlock Admin — More Life" },
      { property: "og:description", content: "Redeem your club licence key." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAccess,
});

function AdminAccess() {
  const { session, loading } = useSession();
  const claim = useServerFn(claimAdminAccess);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="py-10 text-sm text-muted-foreground">Loading…</div>;

  if (!session) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">Sign in first, then redeem your licence key.</p>
        <Link to="/auth" className="mt-4 inline-block label-caps text-primary">
          Sign in
        </Link>
      </div>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await claim({ data: { licenseKey: key } });
      await queryClient.invalidateQueries({ queryKey: ["my-roles"] });
      toast.success("Admin access unlocked");
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify that key");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-sm py-6">
      <h2 className="text-2xl leading-none">Club licence key</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {session.user.email}. Enter the licence key to grant this account admin access.
      </p>
      <label htmlFor="license" className="mt-6 block label-caps text-muted-foreground">
        Licence key
      </label>
      <input
        id="license"
        required
        autoComplete="off"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm tracking-widest outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-md bg-primary px-4 py-3 label-caps text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Checking…" : "Unlock admin"}
      </button>
    </form>
  );
}
