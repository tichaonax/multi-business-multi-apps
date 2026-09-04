-- Makes the customer display's left rotating-card count and right menu-grid
-- column count admin-configurable instead of hardcoded, alongside the
-- existing rotation speed / max items settings.
ALTER TABLE "display_global_settings" ADD COLUMN "leftPanelCardCount" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "display_global_settings" ADD COLUMN "rightPanelColumns" INTEGER NOT NULL DEFAULT 2;
