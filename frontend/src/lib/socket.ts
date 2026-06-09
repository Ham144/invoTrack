import { io, type Socket } from "socket.io-client";
import { queryClient } from "@/lib/query-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }
  return socket;
}

export function connectOrgSocket(organizationName: string) {
  const s = getSocket();
  s.emit("join_org", { organizationName });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["scan-log"] });
    void queryClient.invalidateQueries({ queryKey: ["device-status"] });
    void queryClient.invalidateQueries({ queryKey: ["active-recordings"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    window.dispatchEvent(new CustomEvent("scan-log-update"));
    window.dispatchEvent(new CustomEvent("device-status-update"));
  };

  s.off("scan-log-update");
  s.off("device-status-update");
  s.on("scan-log-update", invalidate);
  s.on("device-status-update", invalidate);

  return s;
}

export function disconnectOrgSocket(organizationName: string) {
  socket?.emit("leave_org", { organizationName });
}
