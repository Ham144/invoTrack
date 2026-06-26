import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { OrganizationApi } from "@/api/organization";
import { useSessionStore } from "@/stores/sessionStore";

interface Org {
  name: string;
}

export default function OrgSwitcher() {
  const setUser = useSessionStore((s) => s.setUser);
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: async () => {
      const res = await OrganizationApi.myOrganizations();
      return res.data as Org[];
    },
  });

  const switchOrg = useMutation({
    mutationFn: (name: string) => OrganizationApi.switchOrg(name),
    onSuccess: (res) => {
      setUser(res.data);
      qc.invalidateQueries();
      window.location.reload();
    },
  });

  const active = user?.organizationName;

  return (
    <div className="surface-card">
      <div className="card-body gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Organisasi</h2>
        </div>
        <p className="text-sm text-base-content/70">
          Aktif: <strong>{active ?? "—"}</strong>
        </p>
        {isLoading ? (
          <div className="skeleton h-24 w-full rounded-xl" />
        ) : (
          <ul className="menu bg-base-200/50 rounded-xl border border-base-300 p-1">
            {data?.map((org) => {
              const selected = org.name === active;
              return (
                <li key={org.name}>
                  <button
                    type="button"
                    className={`rounded-lg ${selected ? "active font-semibold" : ""}`}
                    onClick={() => switchOrg.mutate(org.name)}
                    disabled={switchOrg.isPending || selected}
                  >
                    {org.name}
                    {selected && (
                      <span className="badge badge-primary badge-xs ml-auto">
                        aktif
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {!data?.length && (
              <li className="text-sm text-base-content/60 px-3 py-2">
                Tidak ada organisasi lain.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
