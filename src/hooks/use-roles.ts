import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/admin.functions";
import { useSession } from "./use-session";

export function useRoles() {
  const { session, loading } = useSession();
  const fetchRoles = useServerFn(getMyRoles);

  const query = useQuery({
    queryKey: ["my-roles", session?.user.id ?? null],
    queryFn: () => fetchRoles(),
    enabled: !!session,
    staleTime: 60_000,
  });

  return {
    session,
    loading: loading || (!!session && query.isLoading),
    isAdmin: query.data?.isAdmin ?? false,
    isStaff: query.data?.isStaff ?? false,
    roles: query.data?.roles ?? [],
  };
}
