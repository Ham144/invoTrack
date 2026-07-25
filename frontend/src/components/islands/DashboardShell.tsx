import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Monitor,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  BookOpen,
} from "lucide-react";
import { useSessionStore } from "@/stores/sessionStore";
import { ROLE } from "@/types/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { APP_NAME } from "@/lib/constants";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  roles?: ROLE[];
};

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operasi",
    items: [
      {
        href: "/dashboard",
        label: "Ringkasan",
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
      {
        href: "/dashboard/scan-log",
        label: "Scan Log",
        icon: <ClipboardList className="w-4 h-4" />,
      },
    ],
  },
  {
    title: "Infrastruktur",
    items: [
      {
        href: "/dashboard/devices",
        label: "Perangkat & CCTV",
        icon: <Monitor className="w-4 h-4" />,
        roles: [ROLE.ADMIN_ORGANIZATION, ROLE.ADMIN_GUDANG],
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/admin/members",
        label: "Anggota",
        icon: <Users className="w-4 h-4" />,
        roles: [ROLE.ADMIN_ORGANIZATION],
      },
      {
        href: "/admin/organization",
        label: "Organisasi",
        icon: <Building2 className="w-4 h-4" />,
        roles: [ROLE.ADMIN_ORGANIZATION],
      },
    ],
  },
];

function NavLinks({
  role,
  sessionReady,
  onNavigate,
}: {
  role?: ROLE;
  sessionReady: boolean;
  onNavigate?: () => void;
}) {
  const [path, setPath] = useState("");

  useEffect(() => {
    setPath(window.location.pathname);
  }, []);

  const canSee = (item: NavItem) => {
    if (!item.roles?.length) return true;
    if (!sessionReady || !role) return false;
    return item.roles.includes(role);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return path === href;
    return path.startsWith(href);
  };

  return (
    <>
      {NAV_GROUPS.map((group) => {
        const visible = group.items.filter(canSee);
        if (visible.length === 0) return null;
        return (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider muted">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {visible.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors border-l-2 ${
                        active
                          ? "border-l-primary bg-primary/8 text-primary"
                          : "border-l-transparent text-base-content opacity-70 hover:bg-base-200 hover:opacity-100"
                      }`}
                    >
                      <span className={active ? "text-primary" : "opacity-50"}>
                        {item.icon}
                      </span>
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useSessionStore((s) => s.user);
  const sessionReady = useSessionStore((s) => s.sessionReady);

  return (
    <div className="flex min-h-screen bg-base-200">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 btn btn-sm btn-square bg-base-100 border border-base-300 shadow-soft"
        aria-label="Menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 z-50 h-screen w-[260px] shrink-0 bg-base-100 border-r border-base-300 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-base-300">
          <a href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/favicon.png"
              alt=""
              className="w-8 h-8 rounded-lg shrink-0"
            />
            <span className="font-semibold text-base truncate">{APP_NAME}</span>
          </a>
          <button
            type="button"
            className="md:hidden btn btn-ghost btn-xs btn-square"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
          <NavLinks
            role={user?.role}
            sessionReady={sessionReady}
            onNavigate={() => setMobileOpen(false)}
          />
          {!sessionReady && (
            <div className="px-3 pt-4 space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-9 w-full rounded-lg" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-base-300 space-y-2">
          {user && (
            <div className="rounded-lg bg-base-200 px-3 py-2.5 border p-2 truncate">
              <p className="text-sm font-medium truncate">
                {user.displayName || user.username}
              </p>
              <p className="text-xs muted truncate">
                {ROLE_LABELS[user.role] ?? user.role}
                {user.organizationName ? ` · ${user.organizationName}` : ""}
              </p>
            </div>
          )}
          <div className="flex gap-x-3">
            <a
              href="/dashboard/docs"
              className="btn-primary-soft w-full justify-start text-xs font-semibold px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-none border border-blue-200/50"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              Dokumentasi
            </a>
            <button
              type="button"
              className="btn btn-ghost btn-sm w-full justify-start gap-2 opacity-70 hover:text-error hover:opacity-100"
              onClick={async () => {
                await fetch("/api/user/logout", {
                  method: "DELETE",
                  credentials: "include",
                });
                window.location.href = "/";
              }}
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-3">
        <div className="max-w-9xl mx-auto animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}
