import { ROLE } from "@/types/auth";

/** Bisa mengubah CCTV, scanner, workstation, pengaturan agent. */
export function canManageInfrastructure(role?: ROLE): boolean {
  return role === ROLE.ADMIN_ORGANIZATION || role === ROLE.SUPERTENANT;
}

export function canManageMembers(role?: ROLE): boolean {
  return role === ROLE.ADMIN_ORGANIZATION || role === ROLE.SUPERTENANT;
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN_ORGANIZATION: "Admin Organisasi",
  ADMIN_GUDANG: "Admin Gudang",
  OPERATOR: "Operator",
  SUPERTENANT: "Supertenant",
};
