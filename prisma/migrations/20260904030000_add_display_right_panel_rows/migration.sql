-- Makes the customer display's right menu-grid row count (per page) admin-
-- configurable, alongside the existing column count — fewer rows means taller,
-- more visible item cards/images.
ALTER TABLE "display_global_settings" ADD COLUMN "rightPanelRows" INTEGER NOT NULL DEFAULT 4;
