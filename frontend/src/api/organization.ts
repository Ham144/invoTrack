import axiosInstance from "@/lib/axios";

export const OrganizationApi = {
  landing: () => axiosInstance.get("/api/organization/landing-page"),
  myOrganizations: () =>
    axiosInstance.get("/api/organization/my-organizations"),
  switchOrg: (name: string) =>
    axiosInstance.post("/api/organization/switch", { name }),
  getSettings: () =>
    axiosInstance.get("/api/organization/my-organization-settings"),
  updateSettings: (body: {
    name: string;
    recordingMaxDurationSec?: number;
  }) => axiosInstance.put("/api/organization/my-organization-settings", body),
};
