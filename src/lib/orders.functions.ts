import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const placeOrderSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1),
  deliveryAddress: z.string().trim().min(6).max(500),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type OrderSummary = {
  id: string;
  reference: string;
  status: string;
  total: number;
  created_at: string;
  item_count: number;
};

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, reference, status, total, created_at, order_items(quantity)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((o) => ({
      id: o.id,
      reference: o.reference,
      status: o.status as string,
      total: Number(o.total),
      created_at: o.created_at,
      item_count: (o.order_items ?? []).reduce(
        (sum: number, i: { quantity: number }) => sum + i.quantity,
        0,
      ),
    })) satisfies OrderSummary[];
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: z.string().uuid().parse(data.id) }))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(
        "id, reference, status, total, delivery_address, contact_phone, notes, created_at, order_items(id, product_name, unit_price, quantity)",
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!order) return null;

    return {
      id: order.id,
      reference: order.reference,
      status: order.status as string,
      total: Number(order.total),
      delivery_address: order.delivery_address,
      contact_phone: order.contact_phone,
      notes: order.notes,
      created_at: order.created_at,
      items: (order.order_items ?? []).map((i) => ({
        id: i.id,
        product_name: i.product_name,
        unit_price: Number(i.unit_price),
        quantity: i.quantity,
      })),
    };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => placeOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ids = [...new Set(data.items.map((i) => i.productId))];

    const { data: products, error: pErr } = await context.supabase
      .from("products")
      .select("id, name, price, active")
      .in("id", ids);

    if (pErr) throw new Error(pErr.message);

    const priced = data.items
      .map((item) => {
        const product = (products ?? []).find((p) => p.id === item.productId);
        if (!product || !product.active) return null;
        return {
          product_id: product.id,
          product_name: product.name,
          unit_price: Number(product.price),
          quantity: item.quantity,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (priced.length === 0) throw new Error("None of the items in your bag are available.");

    // Totals are always recalculated server-side from the stored price.
    const total = priced.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

    const { data: order, error: oErr } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        total,
        delivery_address: data.deliveryAddress,
        contact_phone: data.contactPhone ?? null,
        notes: data.notes ?? null,
      })
      .select("id, reference")
      .single();

    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = await context.supabase
      .from("order_items")
      .insert(priced.map((i) => ({ ...i, order_id: order.id })));

    if (iErr) throw new Error(iErr.message);

    return { id: order.id, reference: order.reference, total };
  });
