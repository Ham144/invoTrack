import axios from "@/lib/axios";
import type { ROLE } from "@/types/auth";

export const AuthApi = {
  login: (username: string, password: string) =>
    axios.post("/api/user/login", { username, password }),
  logout: () => axios.delete("/api/user/logout"),
  getUserInfo: () => axios.get("/api/user/get-user-info"),
  listMembers: (page: number, searchKey?: string, role?: string) =>
    axios.get("/api/user/list-member-management", {
      params: { page, searchKey, role },
    }),
  createUser: (body: {
    username: string;
    password: string;
    role: ROLE;
    displayName?: string;
    description?: string;
    mail?: string;
  }) => axios.post("/api/user/create", body),
  updateUser: (body: {
    username: string;
    role?: ROLE;
    displayName?: string;
    password?: string;
  }) => axios.patch("/api/user/update", body),
  deleteUser: (username: string) =>
    axios.delete(`/api/user/delete/${username}`),
};
