import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthApi } from "@/api/auth";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataTable from "@/components/ui/DataTable";
import type { UserInfo, PaginatedMembers } from "@/types/auth";
import { ROLE } from "@/types/auth";

export default function MembersPanel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: ROLE.OPERATOR as ROLE,
    description: "operator",
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const members = useQuery({
    queryKey: ["members", page, debouncedSearch],
    queryFn: async () => {
      const res = await AuthApi.listMembers(page, debouncedSearch, "all");
      return res.data as PaginatedMembers;
    },
  });

  const createUser = useMutation({
    mutationFn: () => AuthApi.createUser(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      setForm({
        username: "",
        password: "",
        displayName: "",
        role: ROLE.OPERATOR,
        description: "operator",
      });
      toast.success("Anggota ditambahkan");
    },
    onError: () => toast.error("Gagal menambah anggota"),
  });

  const deleteUser = useMutation({
    mutationFn: (username: string) => AuthApi.deleteUser(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      setDeleteTarget(null);
      toast.success("Anggota dihapus");
    },
  });

  const items = members.data?.items ?? [];
  const total = members.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-8">
      <section className="card bg-base-100 border border-base-300">
        <div className="card-body gap-4">
          <h2 className="font-semibold">Tambah anggota</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              className="input input-bordered input-sm"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
            <input
              className="input input-bordered input-sm"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <input
              className="input input-bordered input-sm"
              placeholder="Nama tampilan"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            <select
              className="select select-bordered select-sm"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as ROLE }))
              }
            >
              {Object.values(ROLE).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={
                createUser.isPending ||
                !form.username.trim() ||
                form.password.length < 5
              }
              onClick={() => createUser.mutate()}
            >
              Tambah
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <h2 className="font-semibold">Daftar anggota</h2>
          <input
            className="input input-bordered input-sm w-full sm:w-64"
            placeholder="Cari username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DataTable loading={members.isLoading} empty={!members.isLoading && items.length === 0}>
          <table className="table table-sm">
            <thead className="bg-base-200">
              <tr>
                <th>Username</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Scanner</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u: UserInfo) => (
                <tr key={u.username}>
                  <td className="font-mono">{u.username}</td>
                  <td>{u.displayName}</td>
                  <td>
                    <span className="badge badge-outline badge-sm">{u.role}</span>
                  </td>
                  <td className="text-sm">
                    {u.assignedScanner?.label ?? (
                      <span className="text-base-content/50">—</span>
                    )}
                    {!u.assignedScanner && (
                      <a
                        href="/dashboard/devices"
                        className="link link-primary text-xs ml-1"
                      >
                        atur
                      </a>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-xs btn-error btn-outline"
                      onClick={() => setDeleteTarget(u.username)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>

        <div className="flex items-center justify-between text-sm">
          <span className="opacity-60">
            {total} anggota · hal {page}/{totalPages}
          </span>
          <div className="join">
            <button
              type="button"
              className="btn btn-xs join-item"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn-xs join-item"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus anggota?"
        message={<>User <strong>{deleteTarget}</strong> akan dihapus permanen.</>}
        confirmLabel="Hapus"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteUser.mutate(deleteTarget)}
      />
    </div>
  );
}
