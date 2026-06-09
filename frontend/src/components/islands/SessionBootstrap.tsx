import { useEffect } from "react";
import { AuthApi } from "@/api/auth";
import { useSessionStore } from "@/stores/sessionStore";
import {
  connectOrgSocket,
  disconnectOrgSocket,
} from "@/lib/socket";
import type { UserInfo } from "@/types/auth";

export default function SessionBootstrap() {
  const setUser = useSessionStore((s) => s.setUser);
  const user = useSessionStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;
    AuthApi.getUserInfo()
      .then((res) => {
        if (!cancelled) setUser(res.data as UserInfo);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  useEffect(() => {
    const org = user?.organizationName;
    if (!org) return;
    connectOrgSocket(org);
    return () => disconnectOrgSocket(org);
  }, [user?.organizationName]);

  return null;
}
