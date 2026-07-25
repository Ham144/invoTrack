/**
 * Dev: kosongkan VITE_API_URL agar axios memakai /api via proxy Vite (cookie login jalan).
 * Akses LAN: buka http://IP:4321
 */
export const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.PUBLIC_API_URL || "";
export const APP_NAME = import.meta.env.VITE_APP_NAME || import.meta.env.PUBLIC_APP_NAME || "BuktiScan";
