import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number;
  image_url: string | null;
  in_stock: boolean;
  featured: boolean;
  category_slug: string | null;
  category_name: string | null;
};

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

type RawRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number | string;
  image_url: string | null;
  in_stock: boolean;
  featured: boolean;
  categories: { slug: string; name: string } | null;
};

function toProduct(row: RawRow): CatalogProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    price: Number(row.price),
    image_url: row.image_url,
    in_stock: row.in_stock,
    featured: row.featured,
    category_slug: row.categories?.slug ?? null,
    category_name: row.categories?.name ?? null,
  };
}

const SELECT =
  "id, slug, name, tagline, description, price, image_url, in_stock, featured, categories(slug, name)";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [{ data: products, error: pErr }, { data: categories, error: cErr }] = await Promise.all([
    supabase
      .from("products")
      .select(SELECT)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("categories")
      .select("id, slug, name, description")
      .order("sort_order", { ascending: true }),
  ]);

  if (pErr) throw new Error(pErr.message);
  if (cErr) throw new Error(cErr.message);

  return {
    products: ((products ?? []) as unknown as RawRow[]).map(toProduct),
    categories: (categories ?? []) as CatalogCategory[],
  };
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("products")
      .select(SELECT)
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return { product: null, related: [] as CatalogProduct[] };

    const product = toProduct(row as unknown as RawRow);

    const { data: related } = await supabase
      .from("products")
      .select(SELECT)
      .eq("active", true)
      .neq("slug", data.slug)
      .limit(4);

    return {
      product,
      related: ((related ?? []) as unknown as RawRow[]).map(toProduct),
    };
  });
