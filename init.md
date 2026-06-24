Act as a Senior Solutions Architect. Create a clean, modular project blueprint for a Multi-Tenant IoT application named "BuktiScan CSI".

The core feature is combining Invoice Scanning with CCTV Auto-Recording/Cutting in a local network environment (with a future-proof design for cloud SaaS conversion).

The tech stack strictly uses:

- Backend: NestJS (TypeScript)
- Frontend: Astro + React islands (TypeScript)

Please map out ONLY the project structures, configuration concepts, and architectural workflows. Avoid deep technical code implementations for now. Focus on speed and blueprint mapping.

---

### 1. APPLICATION NAMING & IDENTITY

- Name: BuktiScan

### 2. MONOREPO / MULTI-DIRECTORY STRUCTURE

Generate a clean folder structure showcasing the separation of the NestJS backend and Astro frontend. Include placeholder files for multi-tenancy configurations and IoT edge handling.

[Please generate the tree structure for: /backend (NestJS) and /frontend (Astro+React)]

### 3. ARCHITECTURAL CONCEPT MAP

Briefly outline the conceptual workflow of how data flows without writing extensive code logic:

1. Scanner Event Trigger -> Reaches NestJS
2. Multi-Tenant Context Resolver -> Identifies which tenant, CCTV IP (RTSP), and configuration to use.
3. Video Cutting Logic -> Concept of triggering FFmpeg to save the segment tied to the Invoice ID.
4. Real-time Frontend Update -> Astro/React UI receives the update via WebSockets.

### 4. MULTI-TENANCY DATABASE SCHEMA (CONCEPT ONLY)

Provide a simplified conceptual schema/JSON representation showing how tables (Tenants, Users, Invoices, CCTV_Configs) are linked via `tenant_id` to ensure isolation from day one.

### 5. ASTRO + REACT FRONTEND ARCHITECTURE

Map out how Astro handles the static multi-tenant dashboard shell, while React islands are utilized for real-time video playback and live scan log feeds.
