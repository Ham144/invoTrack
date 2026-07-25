import { Search } from "lucide-react";
import { useState, type ReactNode, useEffect, useRef } from "react";
import { NAV_GROUPS } from "../islands/DashboardShell";

interface MenuItem {
  href: string;
  label: string;
  icon?: ReactNode;
  groupLabel?: string;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allMenuItems = NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, groupLabel: group.title })),
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const q = searchValue.trim().toLowerCase();
      if (!q) {
        setSearchResults([]);
        setIsDropdownOpen(false);
        return;
      }
      const results = allMenuItems.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q),
      );
      setSearchResults(results);
      setIsDropdownOpen(results.length > 0);
    }, 200);
    return () => clearTimeout(t);
  }, [searchValue, allMenuItems]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="mb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="min-w-0 space-y-3">
          {badge}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base text-slate-500 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative" ref={searchRef}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              placeholder="Cari menu…"
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {isDropdownOpen && (
              <ul className="absolute z-50 mt-2 w-full sm:w-72 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      {item.label}
                      <span className="text-xs text-slate-400 ml-2 font-normal">
                        {item.groupLabel}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {actions}
        </div>
      </div>
    </header>
  );
}
