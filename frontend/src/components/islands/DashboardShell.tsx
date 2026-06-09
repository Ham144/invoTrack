import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ScanLine,
  ClipboardList,
  Monitor,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useSessionStore } from "@/stores/sessionStore";
import { ROLE } from "@/types/auth";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  roles?: ROLE[];
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operasi",
    items: [
      {
        href: "/dashboard",
        label: "Ringkasan",
        icon: <LayoutDashboard className="w-5 h-5" />,
      },
      {
        href: "/dashboard/scan",
        label: "Scan",
        icon: <ScanLine className="w-5 h-5" />,
      },
      {
        href: "/dashboard/scan-log",
        label: "Scan Log",
        icon: <ClipboardList className="w-5 h-5" />,
      },
    ],
  },
  {
    title: "Infrastruktur",
    items: [
      {
        href: "/dashboard/devices",
        label: "Perangkat & CCTV",
        icon: <Monitor className="w-5 h-5" />,
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
        icon: <Users className="w-5 h-5" />,
        roles: [ROLE.ADMIN_ORGANIZATION],
      },
      {
        href: "/admin/organization",
        label: "Organisasi",
        icon: <Building2 className="w-5 h-5" />,
        roles: [ROLE.ADMIN_ORGANIZATION],
      },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN_ORGANIZATION: "Admin Org",
  ADMIN_GUDANG: "Admin Gudang",
  OPERATOR: "Operator",
  SUPERTENANT: "Supertenant",
};

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useSessionStore((s) => s.user);
  const sessionReady = useSessionStore((s) => s.sessionReady);

  return (
    <div className="flex min-h-screen bg-base-200">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 btn btn-sm btn-square btn-ghost bg-base-100 shadow"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 shrink-0 bg-base-100 border-r border-base-300 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-base-300 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-content font-bold text-sm">
              IT
            </div>
            <span className="font-bold text-lg">InvoTrack</span>
          </a>
          <button
            type="button"
            className="md:hidden btn btn-ghost btn-xs btn-square"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <NavLinks
            role={user?.role}
            sessionReady={sessionReady}
            onNavigate={() => setMobileOpen(false)}
          />
          {!sessionReady && (
            <div className="px-2 space-y-2 pt-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-base-300">
          <button
            type="button"
            className="btn btn-outline btn-error btn-sm w-full gap-2"
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-base-100/90 backdrop-blur border-b border-base-300 px-4 md:px-8 py-3 mt-14 md:mt-0">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
            <div className="min-w-0">
              <p className="text-xs text-base-content/50 uppercase tracking-wide">
                Organisasi
              </p>
              <p className="font-semibold truncate">
                {sessionReady ? (user?.organizationName ?? "—") : (
                  <span className="inline-block skeleton h-4 w-32 align-middle" />
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-medium text-sm truncate max-w-[160px]">
                {user?.displayName ?? user?.username ?? "—"}
              </p>
              {user?.role && (
                <span className="badge badge-sm badge-primary badge-outline mt-1">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

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
          <div key={group.title}>
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider px-2 mb-2">
              {group.title}
            </p>
            <ul className="space-y-1">
              {visible.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-primary text-primary-content"
                        : "text-base-content/80 hover:bg-base-200"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}
