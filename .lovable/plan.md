## More Life Members — Member PWA

A dark, luxe green/black members app matching morelifemembers.co.za: browse the curated range, order for delivery, and manage your membership. Installable to the home screen and usable offline.

### Design direction
Match the existing site: near-black backgrounds, deep botanical green accents, warm off-white type, generous spacing, large editorial imagery and confident uppercase headings. All colours defined as semantic tokens (dark-first). Mobile-first layout with a bottom tab bar (Shop, Orders, Membership, More) since this is an installed phone app.

### Screens
```text
/                 Home — hero, featured products, delivery blurb, install prompt
/products         Catalogue — category filter, grid of products
/products/$slug   Product detail — gallery, strain notes, price, add to cart
/cart             Cart — quantities, subtotal, delivery note, place order
/auth             Sign in / sign up
/orders           My orders (member only)
/orders/$id       Order detail + status
/membership       Membership card, profile details (member only)
/delivery         Delivery & Service info
/about            About More Life
/contact          Contact details & hours
```
Plus a first-visit age-verification gate (18+ confirmation, remembered locally) — standard and expected for this category.

### Backend (Lovable Cloud)
Tables, all with RLS and explicit grants:
- `categories`, `products` (name, slug, description, price, image, category, stock, featured, active) — public read
- `profiles` (display name, phone, delivery address) — owner read/write, auto-created on signup
- `user_roles` + `has_role()` — separate table, admin checks server-side
- `orders` (user, status, total, delivery address, notes) and `order_items` — owner reads own, admins read all

Seeded in the migration with real categories and a starter product set drawn from the live site so the app has content on first load.

Email/password + Google sign-in. Cart lives client-side until checkout; placing an order writes to the database through an authenticated server function that recalculates totals server-side (never trusting client prices).

### PWA
Web manifest with More Life name, icons, dark theme colour and standalone display, plus generated offline caching (network-first for pages, cache-first for images and assets) so the catalogue stays viewable without signal. Offline behaviour only applies to the published app, not the editor preview.

### Technical notes
- TanStack Start routes; member-only pages under an authenticated layout.
- Public catalogue reads via a public server function with anon SELECT policies; orders and profiles via authenticated server functions.
- Product imagery: reuse the store's existing artwork where linkable, otherwise generate matching on-brand assets.
- Per-route head metadata (title, description, og tags) for each page.

### Not included (say the word and I'll add)
- Online card payment — orders are placed as requests and confirmed by staff.
- An admin dashboard for editing products/orders in-app.
