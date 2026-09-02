import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Leaf } from "lucide-react";
import { getMyProfile } from "@/lib/profile.functions";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { PushToggle } from "@/components/PushToggle";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Your Membership — More Life Members Club" },
      { name: "description", content: "Your More Life membership card and account details." },
      { property: "og:title", content: "Your Membership — More Life" },
      { property: "og:description", content: "Your More Life membership card and details." },
    ],
  }),
  component: Membership,
});

function Membership() {
  const { session, loading } = useSession();
  const { isAdmin } = useRoles();
  const fetchProfile = useServerFn(getMyProfile);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!session,
  });

  if (loading) return <div className="px-4 py-16 text-sm text-muted-foreground">Loading…</div>;

  if (!session) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="text-3xl">Membership</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to view your membership card.
        </p>
        <Link
          to="/auth"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 label-caps text-primary-foreground"
        >
          Sign in or join
        </Link>
      </div>
    );
  }

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="px-4 py-8">
      <h1 className="text-4xl leading-none">Membership</h1>

      <div className="mt-6 rounded-lg border border-primary/40 bg-card p-6">
        <div className="flex items-center justify-between">
          <Leaf className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="label-caps text-gold">Member</span>
        </div>
        <p className="mt-8 font-display text-3xl uppercase leading-none">
          {profile?.display_name ?? session.user.email}
        </p>
        <p className="mt-4 label-caps text-muted-foreground">Member number</p>
        <p className="text-lg tracking-[0.25em]">{profile?.member_number ?? "—"}</p>
        {profile?.created_at && (
          <p className="mt-4 text-xs text-muted-foreground">
            Member since {new Date(profile.created_at).toLocaleDateString("en-ZA")}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>Email: {session.user.email}</p>
        {profile?.phone && <p>Phone: {profile.phone}</p>}
        {profile?.delivery_address && <p>Delivery: {profile.delivery_address}</p>}
      </div>

      <PushToggle />

      {isAdmin && (
        <Link
          to="/admin"
          className="mt-4 block rounded-md border border-primary/50 px-4 py-3 text-center label-caps text-primary"
        >
          Open club admin
        </Link>
      )}

      <button
        onClick={signOut}
        className="mt-8 w-full rounded-md border border-border px-4 py-3 label-caps text-muted-foreground hover:bg-secondary"
      >
        Sign out
      </button>
    </div>
  );
}
