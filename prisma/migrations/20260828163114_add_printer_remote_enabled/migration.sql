-- MBM-283 Phase 2: opt-in remote/mobile printing flag for AGENT-mode printers.
ALTER TABLE "network_printers" ADD COLUMN "remoteEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather every printer already in AGENT mode at migration time — MBM-275's
-- existing local printing has always meant "any device in this business can use
-- it" (see MBM-283 finding #6), so this migration must not silently break any
-- currently-working setup. Only brand-new AGENT configurations, created after
-- this migration, start out opted out (the column's own DEFAULT false above).
UPDATE "network_printers" SET "remoteEnabled" = true WHERE "connectionMode" = 'AGENT';
