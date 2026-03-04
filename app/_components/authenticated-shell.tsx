"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { AppRole } from "@/lib/auth/server";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users", adminOnly: true },
  { href: "/admin/statistics", label: "Statistics", adminOnly: true },
];

type AuthenticatedShellProps = {
  email: string | null;
  role: AppRole;
  children: React.ReactNode;
};

export default function AuthenticatedShell({
  email,
  role,
  children,
}: AuthenticatedShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => (item.adminOnly ? role === "admin" : true)),
    [role]
  );

  return (
    <main style={{ maxWidth: 1280, paddingTop: "1.25rem" }}>
      <div style={{ marginBottom: "0.85rem", display: "flex", justifyContent: "space-between", gap: 12 }}>
        <button type="button" onClick={() => setSidebarOpen((open) => !open)}>
          {sidebarOpen ? "Hide menu" : "Show menu"}
        </button>
        <p className="muted" style={{ margin: 0, alignSelf: "center" }}>
          {email ?? "utente autenticato"}
        </p>
      </div>

      <div className="auth-shell">
        <aside
          className="card"
          style={{
            width: 260,
            alignSelf: "flex-start",
            display: sidebarOpen ? "block" : undefined,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Menu</h2>
          <nav style={{ display: "grid", gap: 6 }}>
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: isActive ? "rgba(15, 118, 110, 0.12)" : "transparent",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <form action="/auth/signout" method="post" style={{ marginTop: 14 }}>
            <button type="submit">Sign out</button>
          </form>
        </aside>

        <section style={{ minWidth: 0, flex: 1 }}>{children}</section>
      </div>
    </main>
  );
}
