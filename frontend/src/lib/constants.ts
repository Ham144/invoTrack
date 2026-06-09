/**
 * Dev: kosongkan PUBLIC_API_URL agar axios memakai /api via proxy Vite (cookie login jalan).
 * Akses LAN: buka http://IP:4321 — jangan arahkan browser ke localhost:3001.
 */
export const BASE_URL = import.meta.env.PUBLIC_API_URL ?? '';
