import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  deliveryAddress: z.string().trim().max(500).optional().nullable(),
});

export type MemberProfile = {
  id: string;
  display_name: string | null;
  phone: string | null;
  delivery_address: string | null;
  member_number: string;
  created_at: string;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, phone, delivery_address, member_number, created_at")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data ?? null) as MemberProfile | null;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("profiles")
      .update({
        display_name: data.displayName ?? null,
        phone: data.phone ?? null,
        delivery_address: data.deliveryAddress ?? null,
      })
      .eq("id", context.userId)
      .select("id, display_name, phone, delivery_address, member_number, created_at")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (updated ?? null) as MemberProfile | null;
  });
