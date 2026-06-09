import { useQuery } from "@tanstack/react-query";
import { OrganizationApi } from "@/api/organization";
import type { LandingStats } from "@/types/invo-track";

export default function LandingStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const res = await OrganizationApi.landing();
      return res.data as LandingStats;
    },
  });

  const items = [
    { label: "Organisasi", value: data?.totalOrganizations ?? 0 },
    { label: "Scan hari ini", value: data?.totalScansToday ?? 0 },
    { label: "CCTV aktif", value: data?.activeCctv ?? 0 },
    { label: "CCTV online", value: data?.onlineCctv ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
        >
          <p className="text-xs font-medium text-slate-500">{item.label}</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 tabular-nums">
            {isLoading ? "…" : item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
