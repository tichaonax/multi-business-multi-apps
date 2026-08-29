-- Data cleanup (no schema change): revoking a WorkstationAgents pairing has
-- never disabled the NetworkPrinters row(s) declared on it. Re-pairing the
-- same physical workstation mints a brand new WorkstationAgents row rather
-- than reusing the old one, so the old printer just keeps existing with
-- remotePrintingEnabled = true forever — a permanently-offline "zombie"
-- that still shows up in every printer picker and admin list as if it were
-- a real, live option, right alongside its replacement. This is the same
-- shape of bug fixed for ScaleDeviceConfigs on revoke (see the DELETE
-- /api/admin/workstation-agents/[id] route), just not caught for printers
-- at the time.
--
-- Disabled here, not deleted — deleting would cascade-delete real print job
-- history via NetworkPrinters' onDelete: Cascade foreign keys (print_jobs,
-- default_receipt_printer_configs). The application code going forward
-- (DELETE /api/admin/workstation-agents/[id]) now does this same disable at
-- revoke time, and printer-service.ts / print-dispatch.ts now also exclude
-- an AGENT printer whose owning agent is revoked regardless of this flag —
-- this migration just brings any already-revoked pairing's printer, on any
-- environment, in line with that from here on.
UPDATE "network_printers"
SET "remotePrintingEnabled" = false,
    "remoteEnabled" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "connectionMode" = 'AGENT'
  AND "workstationAgentId" IN (
    SELECT "id" FROM "workstation_agents" WHERE "revokedAt" IS NOT NULL
  )
  AND ("remotePrintingEnabled" = true OR "remoteEnabled" = true);
