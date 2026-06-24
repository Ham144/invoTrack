import { defineMiddleware } from "astro:middleware";
import type { TokenPayload } from "./types/auth";
import { ROLE } from "./types/auth";

const DASHBOARD_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";

declare const __API_PROXY_TARGET__: string;
const API_TARGET =
  typeof __API_PROXY_TARGET__ !== "undefined"
    ? __API_PROXY_TARGET__
    : "http://127.0.0.1:3001";

function shouldProxy(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/socket.io")
  );
}

async function proxyToBackend(
  request: Request,
  url: URL,
): Promise<Response> {
  const target = new URL(url.pathname + url.search, API_TARGET);
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  return fetch(target, init);
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload)) as TokenPayload & {
      exp?: number;
    };
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (shouldProxy(pathname)) {
    return proxyToBackend(context.request, context.url);
  }

  const token = context.cookies.get("access_token")?.value;
  const refresh = context.cookies.get("refresh_token")?.value;

  if (pathname === "/" || pathname === "/forbidden") {
    return next();
  }

  if (pathname === "/dashboard/settings") {
    return context.redirect("/dashboard/devices");
  }

  if (pathname === "/dashboard/proof") {
    return context.redirect("/dashboard/scan-log");
  }

  const needsAuth =
    pathname.startsWith(DASHBOARD_PREFIX) || pathname.startsWith(ADMIN_PREFIX);

  if (!needsAuth) return next();

  const decoded = token ? decodeToken(token) : null;

  // access_token kedaluwarsa (10 menit) tapi refresh_token masih ada:
  // izinkan masuk, client axios akan refresh otomatis.
  if (!decoded?.role) {
    if (refresh) return next();
    return context.redirect("/");
  }

  if (decoded.role === ROLE.SUPERTENANT) return next();
  if (decoded.role === ROLE.ADMIN_ORGANIZATION) return next();

  if (pathname.startsWith(ADMIN_PREFIX)) {
    return context.redirect("/forbidden");
  }

  const allowedDashboard =
    decoded.role === ROLE.ADMIN_GUDANG || decoded.role === ROLE.OPERATOR;

  if (pathname.startsWith(DASHBOARD_PREFIX) && allowedDashboard) {
    return next();
  }

  return context.redirect("/forbidden");
});
