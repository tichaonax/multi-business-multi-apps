-- CreateTable: Images
-- Stores uploaded image binary data in the database so images are
-- accessible from any machine connecting to the shared PostgreSQL instance.
-- expiresAt: nullable; when set, the GET /api/images/[id] route returns 410
-- after this timestamp (used for 60-day clock-in verification photos).

CREATE TABLE "images" (
    "id"        TEXT        NOT NULL,
    "data"      BYTEA       NOT NULL,
    "mimeType"  TEXT        NOT NULL DEFAULT 'image/jpeg',
    "size"      INTEGER     NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);
