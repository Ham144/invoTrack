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
        label: "Agent",
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
    <div className="flex min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200">
      {/* Mobile Menu Button - Enhanced */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 btn btn-sm btn-square btn-ghost bg-base-100/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-base-300/50"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay with blur */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Enhanced */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 shrink-0 bg-base-100/95 backdrop-blur-sm border-r border-base-300/50 flex flex-col transition-all duration-300 shadow-xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header with gradient accent */}
        <div className="p-5 border-b border-base-300/50 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <a href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-focus flex items-center justify-center text-primary-content font-bold text-sm shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
              IT
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text text-transparent">
              BuktiScan
            </span>
          </a>
          <button
            type="button"
            className="md:hidden btn btn-ghost btn-xs btn-square hover:bg-base-200/50 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation with enhanced spacing */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
          <div className="space-y-1">
            <NavLinks
              role={user?.role}
              sessionReady={sessionReady}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
          {!sessionReady && (
            <div className="px-2 space-y-3 pt-4 border-t border-base-300/30">
              <div className="skeleton h-3 w-24 bg-base-300/50" />
              <div className="skeleton h-10 w-full rounded-xl bg-base-300/50" />
              <div className="skeleton h-10 w-full rounded-xl bg-base-300/50" />
            </div>
          )}
        </nav>

        {/* Footer with logout - Enhanced */}
        <div className="p-4 border-t border-base-300/50 bg-gradient-to-r from-transparent to-error/5">
          <button
            type="button"
            className="btn btn-outline btn-error btn-sm w-full gap-2 hover:shadow-lg hover:shadow-error/20 transition-all duration-300 group"
            onClick={async () => {
              await fetch("/api/user/logout", {
                method: "DELETE",
                credentials: "include",
              });
              window.location.href = "/";
            }}
          >
            <LogOut className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Enhanced with glass morphism */}
        <header className="sticky top-0 z-30 bg-base-100/80 backdrop-blur-md border-b border-base-300/50 px-4 md:px-8 py-4 mt-14 md:mt-0 shadow-sm">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
            <div className="min-w-0">
              <p className="text-xs text-base-content/40 uppercase tracking-wider font-medium">
                Organisasi
              </p>
              <p className="font-semibold text-base truncate">
                {sessionReady ? (
                  (user?.organizationName ?? "—")
                ) : (
                  <span className="inline-block skeleton h-5 w-32 align-middle bg-base-300/50" />
                )}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {/* User Info with improved styling */}
              <div className="text-right">
                <p className="font-semibold text-sm truncate max-w-[160px] text-base-content">
                  {user?.displayName ?? user?.username ?? "—"}
                </p>
                {user?.role && (
                  <span className="badge badge-sm badge-primary badge-outline mt-1 px-3 py-1 border-2 font-medium">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                )}
              </div>

              {/* Optional: User Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold text-sm border-2 border-primary/20">
                {user?.displayName?.[0]?.toUpperCase() ?? "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Enhanced spacing */}
        <main className="flex-1 p-4 md:p-8 bg-gradient-to-b from-base-200/50 to-transparent">
          <div className="max-w-7xl mx-auto animate-fade-in-up">{children}</div>
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
    return path.endsWith(href);
  };

  return (
    <>
      {NAV_GROUPS.map((group) => {
        const visible = group.items.filter(canSee);
        if (visible.length === 0) return null;
        return (
          <div key={group.title} className="space-y-3">
            {/* Group title dengan aksen yang lebih elegan */}
            <div className="flex items-center gap-3 px-3">
              <span className="w-1 h-4 bg-gradient-to-b from-primary to-primary/40 rounded-full" />
              <p className="text-[11px] font-semibold text-base-content/40 uppercase tracking-[0.15em]">
                {group.title}
              </p>
              <div className="flex-1 h-px bg-gradient-to-r from-base-300/40 to-transparent" />
            </div>

            <ul className="space-y-1">
              {visible.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={onNavigate}
                    className={`
                      group relative flex items-center gap-3 px-3 py-2.5 rounded-xl 
                      text-sm font-medium transition-all duration-200
                      ${
                        isActive(item.href)
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm"
                          : "text-base-content/60 hover:text-base-content hover:bg-base-200/50"
                      }
                    `}
                  >
                    {/* Active indicator bar */}
                    {isActive(item.href) && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-sm shadow-primary/30" />
                    )}

                    {/* Icon dengan background saat active */}
                    <span
                      className={`
                        flex items-center justify-center w-7 h-7 rounded-lg
                        transition-all duration-300
                        ${
                          isActive(item.href)
                            ? "bg-primary text-primary-content shadow-md shadow-primary/20"
                            : "text-base-content/40 group-hover:text-primary group-hover:scale-110"
                        }
                      `}
                    >
                      {item.icon}
                    </span>

                    {/* Label dengan efek */}
                    <span
                      className={`
                      transition-all duration-200
                      ${isActive(item.href) ? "text-primary font-semibold" : "group-hover:translate-x-0.5"}
                    `}
                    >
                      {item.label}
                    </span>

                    {/* Active dot indicator */}
                    {isActive(item.href) && (
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] text-primary/40">•</span>
                      </span>
                    )}
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
