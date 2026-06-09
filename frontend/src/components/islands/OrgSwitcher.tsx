import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrganizationApi } from '@/api/organization';
import { useSessionStore } from '@/stores/sessionStore';

interface Org {
  name: string;
}

export default function OrgSwitcher() {
  const setUser = useSessionStore((s) => s.setUser);
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['my-orgs'],
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

  return (
    <div className="space-y-2">
      <p className="text-sm opacity-70">
        Aktif: <strong>{user?.organizationName ?? '—'}</strong>
      </p>
      <ul className="menu bg-base-100 rounded-box border border-base-300">
        {data?.map((org) => (
          <li key={org.name}>
            <button
              type="button"
              className={org.name === user?.organizationName ? 'active' : ''}
              onClick={() => switchOrg.mutate(org.name)}
              disabled={switchOrg.isPending}
            >
              {org.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
