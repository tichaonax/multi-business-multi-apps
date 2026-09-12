-- Removes the legacy peer-to-peer database sync system (never worked in
-- production, disabled in code since 2026-03-14, untouched since 2026-05-25
-- — see ai-contexts/project-plans/review/projectplan-NOTKT-remove-legacy-sync-service-2026-09-12.md).
--
-- Hand-trimmed from `prisma migrate diff` output (same approach as migration
-- 20260905211352_mbm294_category_images_and_gallery) because `prisma migrate
-- dev`'s shadow-database replay fails on the same pre-existing, unrelated
-- drifted migration (20260326000001_education_subcategories) documented
-- there — this file contains ONLY the statements for this change, with all
-- other unrelated drift the diff surfaced excluded.

-- DropForeignKey: NetworkPrinters.nodeId no longer references SyncNodes —
-- both routes that touched it only ever wrote a throwaway placeholder value
-- to satisfy this FK, never read through the relation.
ALTER TABLE "network_printers" DROP CONSTRAINT "network_printers_nodeId_fkey";

-- DropTable: the sync engine's own tables (SyncEvents' operation column
-- must lose its table before SyncOperation can be dropped below, likewise
-- ConflictResolutions before ConflictType/ResolutionStrategy).
DROP TABLE "conflict_resolutions";
DROP TABLE "data_snapshots";
DROP TABLE "full_sync_sessions";
DROP TABLE "network_partitions";
DROP TABLE "node_states";
DROP TABLE "offline_queue";
DROP TABLE "sync_configurations";
DROP TABLE "sync_events";
DROP TABLE "sync_metrics";
DROP TABLE "sync_nodes";
DROP TABLE "sync_sessions";

-- DropEnum
DROP TYPE "ConflictType";
DROP TYPE "ResolutionStrategy";
DROP TYPE "SyncOperation";
