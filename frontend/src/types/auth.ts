export enum ROLE {
  SUPERTENANT = "SUPERTENANT",
  ADMIN_ORGANIZATION = "ADMIN_ORGANIZATION",
  OPERATOR = "OPERATOR",
  ADMIN_GUDANG = "ADMIN_GUDANG",
}

export interface TokenPayload {
  username: string;
  role: ROLE;
  organizationName: string;
  exp?: number;
}

export interface UserScannerInfo {
  id: string;
  label: string;
}

export interface UserInfo {
  username: string;
  displayName: string;
  role: ROLE;
  organizationName?: string;
  description?: string;
  mail?: string;
  assignedScanner?: UserScannerInfo | null;
}

export interface PaginatedMembers {
  items: UserInfo[];
  total: number;
  page: number;
}
