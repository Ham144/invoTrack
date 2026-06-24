export const SubscriptionPlan = {
  TRIAL: { maxCctv: 1, maxScanner: 1, durationDays: 14 },
  PRO: { maxCctv: 3, maxScanner: 3, durationDays: 30 },
} as const;

export enum ROLE {
  SUPERTENANT = 'SUPERTENANT', // ham | jasa
  ADMIN_ORGANIZATION = 'ADMIN_ORGANIZATION', // IT Manager | direktur
  OPERATOR = 'OPERATOR', // operator melakukan scan invoice
  ADMIN_GUDANG = 'ADMIN_GUDANG', // admin gudang | supervisor
}

export enum InvoiceScanStatus {
  RECORDING = 'RECORDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const RecordingSource = {
  EDGE: 'EDGE',
  SERVER: 'SERVER',
} as const;

export type RecordingSourceKey =
  (typeof RecordingSource)[keyof typeof RecordingSource];

export interface GetLandingPageStats {
  totalOrganizations: number;
  totalScansToday: number;
  activeCctv: number;
  onlineCctv: number;
}
