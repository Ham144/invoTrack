import { defineMiddleware } from "astro:middleware";
import type { TokenPayload } from "./types/auth";
import { ROLE } from "./types/auth";

const DASHBOARD_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";

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

  if (!token && refresh) return next();
  if (!token) {
    return context.redirect("/");
  }

  const decoded = decodeToken(token);
  if (!decoded?.role) {
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
