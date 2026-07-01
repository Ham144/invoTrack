import { Search, X } from "lucide-react";
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
    <header className="mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 space-y-2">
          {badge}
          <h1 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm muted max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative" ref={searchRef}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/35 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              placeholder="Cari menu…"
              className="input input-sm input-bordered w-full sm:w-52 pl-9 pr-8 bg-base-100 border-base-300 border p-2 rounded-lg"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {isDropdownOpen && (
              <ul className="absolute z-50 mt-1.5 w-full sm:w-64 bg-base-100 border border-base-300 rounded-lg shadow-panel py-1 max-h-56 overflow-y-auto">
                {searchResults.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block px-3 py-2 text-sm hover:bg-base-200"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      {item.label}
                      <span className="text-xs text-base-content/40 ml-2">
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
