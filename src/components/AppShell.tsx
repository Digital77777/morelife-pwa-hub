import { Link, useRouterState } from "@tanstack/react-router";
import { Leaf, ShoppingBag, Store, ClipboardList, IdCard, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";

const TABS = [
  { to: "/products", label: "Shop", icon: Store },
  { to: "/cart", label: "Bag", icon: ShoppingBag },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/membership", label: "Member", icon: IdCard },
] as const;

const MORE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Shop All" },
  { to: "/delivery", label: "Delivery & Service" },
  { to: "/about", label: "About the Club" },
  { to: "/contact", label: "Contact" },
  { to: "/membership", label: "Membership" },
  { to: "/admin", label: "Club Admin" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-display text-lg uppercase leading-none tracking-wide">
              More Life
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/cart"
              aria-label="Bag"
              className="relative rounded-md p-2 text-foreground transition-colors hover:bg-secondary"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="rounded-md p-2 transition-colors hover:bg-secondary"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-border bg-background">
            <div className="mx-auto w-full max-w-5xl px-4 py-2">
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-border/60 py-3 label-caps text-muted-foreground last:border-b-0 hover:text-foreground"
                  activeProps={{ className: "text-primary" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 pb-24">{children}</main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-28 pt-10 text-xs text-muted-foreground">
        <p>© More Life Members Club {new Date().getFullYear()}. Cape Town, South Africa.</p>
        <p className="mt-1">Members must be 18 or older. Please enjoy responsibly.</p>
      </footer>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center gap-1 py-2.5 label-caps transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.to === "/cart" && count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {count}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
