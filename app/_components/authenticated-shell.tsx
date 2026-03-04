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
  userId: string;
  children: React.ReactNode;
};

export default function AuthenticatedShell({
  email,
  role,
  userId,
  children,
}: AuthenticatedShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tallyNewRegistrationUrl = `https://tally.so/r/nW6KZe?id_utente=${encodeURIComponent(userId)}`;

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => (item.adminOnly ? role === "admin" : true)),
    [role]
  );

  return (
    <main style={{ maxWidth: 1280, paddingTop: "1.25rem" }}>
      <div style={{ marginBottom: "0.85rem", display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/branding/logo-santegidio.png"
            alt="Logo Comunità di Sant'Egidio"
            style={{ height: 28, width: "auto", objectFit: "contain" }}
          />
          <button type="button" onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? "Hide menu" : "Show menu"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <p className="muted" style={{ margin: 0, alignSelf: "center" }}>
            {email ?? "utente autenticato"}
          </p>
          {role === "responsabile_casa" ? (
            <Link
              href={tallyNewRegistrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                border: "1px solid #0f766e",
                borderRadius: 8,
                padding: "8px 10px",
                fontWeight: 600,
                textDecoration: "none",
                background: "#0f766e",
                color: "#ffffff",
              }}
            >
              Nuova registrazione
            </Link>
          ) : null}
        </div>
      </div>

      <div className="auth-shell">
        <aside
          className="card"
          style={{
            width: 260,
            alignSelf: "flex-start",
            display: sidebarOpen ? "block" : "none",
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
