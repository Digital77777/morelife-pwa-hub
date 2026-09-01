import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Role = "admin" | "staff" | "member";

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role as Role);
    return {
      roles,
      isAdmin: roles.includes("admin"),
      isStaff: roles.includes("admin") || roles.includes("staff"),
    };
  });

/** Redeems the club licence key to grant the signed-in member admin access. */
export const claimAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { licenseKey: string }) => ({
    licenseKey: z.string().trim().min(4).max(200).parse(data.licenseKey),
  }))
  .handler(async ({ data, context }) => {
    const expected = process.env["ADMIN_LICENSE_KEY"];
    if (!expected) throw new Error("Admin access is not configured.");

    const a = new TextEncoder().encode(data.licenseKey);
    const b = new TextEncoder().encode(expected);
    const equal = a.length === b.length && a.every((byte, i) => byte === b[i]);
    if (!equal) throw new Error("That licence key is not valid.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(context: { supabase: { rpc: unknown }; userId: string }) {
  const supabase = context.supabase as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/* ------------------------------- catalogue ------------------------------- */

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  in_stock: boolean;
  featured: boolean;
  active: boolean;
  sort_order: number;
};

const productSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  name: z.string().trim().min(2).max(160),
  tagline: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  price: z.number().min(0).max(1_000_000),
  image_url: z.string().trim().max(1000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  in_stock: z.boolean(),
  featured: z.boolean(),
  active: z.boolean(),
  sort_order: z.number().int().min(0).max(10_000),
});

export const listAdminCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const [{ data: products, error: pErr }, { data: categories, error: cErr }] = await Promise.all([
      context.supabase
        .from("products")
        .select(
          "id, slug, name, tagline, description, price, image_url, category_id, in_stock, featured, active, sort_order",
        )
        .order("sort_order", { ascending: true }),
      context.supabase
        .from("categories")
        .select("id, slug, name, description, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    if (pErr) throw new Error(pErr.message);
    if (cErr) throw new Error(cErr.message);

    return {
      products: (products ?? []).map((p) => ({ ...p, price: Number(p.price) })) as AdminProduct[],
      categories: (categories ?? []) as {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        sort_order: number;
      }[],
    };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...fields } = data;
    const row = {
      ...fields,
      tagline: fields.tagline ?? null,
      description: fields.description ?? null,
      image_url: fields.image_url ?? null,
      category_id: fields.category_id ?? null,
    };

    const query = id
      ? context.supabase.from("products").update(row).eq("id", id)
      : context.supabase.from("products").insert(row);

    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: z.string().uuid().parse(data.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const categorySchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  sort_order: z.number().int().min(0).max(10_000),
});

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...fields } = data;
    const row = { ...fields, description: fields.description ?? null };

    const query = id
      ? context.supabase.from("categories").update(row).eq("id", id)
      : context.supabase.from("categories").insert(row);

    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: z.string().uuid().parse(data.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- orders -------------------------------- */

export type AdminOrder = {
  id: string;
  reference: string;
  status: string;
  total: number;
  delivery_address: string;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
  member_name: string | null;
  member_number: string | null;
  items: { product_name: string; unit_price: number; quantity: number }[];
};

export const listAllOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, reference, status, total, delivery_address, contact_phone, notes, created_at, user_id, order_items(product_name, unit_price, quantity)",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const userIds = [...new Set((data ?? []).map((o) => o.user_id))];
    const { data: profiles } = userIds.length
      ? await context.supabase
          .from("profiles")
          .select("id, display_name, member_number")
          .in("id", userIds)
      : { data: [] as { id: string; display_name: string | null; member_number: string }[] };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (data ?? []).map((o) => ({
      id: o.id,
      reference: o.reference,
      status: o.status as string,
      total: Number(o.total),
      delivery_address: o.delivery_address,
      contact_phone: o.contact_phone,
      notes: o.notes,
      created_at: o.created_at,
      user_id: o.user_id,
      member_name: byId.get(o.user_id)?.display_name ?? null,
      member_number: byId.get(o.user_id)?.member_number ?? null,
      items: (o.order_items ?? []).map((i) => ({
        product_name: i.product_name,
        unit_price: Number(i.unit_price),
        quantity: i.quantity,
      })),
    })) satisfies AdminOrder[];
  });

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  pending: { title: "Order received", body: "We've got your order and will confirm shortly." },
  confirmed: { title: "Order confirmed", body: "Your order is confirmed and being prepared." },
  out_for_delivery: {
    title: "On the way",
    body: "Your order has left the club and is out for delivery.",
  },
  completed: { title: "Delivered", body: "Your order has been delivered. Enjoy responsibly." },
  cancelled: { title: "Order cancelled", body: "Your order was cancelled. Tap for details." },
};

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "out_for_delivery", "completed", "cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: order, error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("id, reference, user_id, status")
      .single();

    if (error) throw new Error(error.message);

    const message = STATUS_MESSAGES[data.status];
    if (message) {
      const { sendPushToUser } = await import("./push.server");
      await sendPushToUser(order.user_id, {
        title: message.title,
        body: `${order.reference} — ${message.body}`,
        url: "/orders",
        tag: `order-${order.id}`,
      });
    }

    return { ok: true, status: order.status as string };
  });

/* ------------------------------- analytics ------------------------------- */

export type AnalyticsSummary = {
  totals: { event: string; count: number }[];
  daily: { day: string; count: number }[];
  recent: { event: string; created_at: string; path: string | null }[];
  orderCount: number;
  revenue: number;
  memberCount: number;
};

export const getAnalyticsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: events, error: eErr }, { data: orders }, { count: memberCount }] =
      await Promise.all([
        context.supabase
          .from("analytics_events")
          .select("event, created_at, path")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5000),
        context.supabase.from("orders").select("total").gte("created_at", since),
        context.supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

    if (eErr) throw new Error(eErr.message);

    const totalsMap = new Map<string, number>();
    const dailyMap = new Map<string, number>();
    for (const row of events ?? []) {
      totalsMap.set(row.event, (totalsMap.get(row.event) ?? 0) + 1);
      const day = row.created_at.slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }

    return {
      totals: [...totalsMap.entries()]
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count),
      daily: [...dailyMap.entries()]
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      recent: (events ?? []).slice(0, 25),
      orderCount: (orders ?? []).length,
      revenue: (orders ?? []).reduce((sum, o) => sum + Number(o.total), 0),
      memberCount: memberCount ?? 0,
    } satisfies AnalyticsSummary;
  });
