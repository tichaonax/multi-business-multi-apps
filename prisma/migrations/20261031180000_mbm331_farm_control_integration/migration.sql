-- MBM-331: Farm Control camera integration
-- CreateTable
CREATE TABLE "farm_control_integrations" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "baseUrl" TEXT NOT NULL DEFAULT '',
    "integrationId" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "keyId" TEXT NOT NULL DEFAULT '',
    "publicKeyPem" TEXT NOT NULL DEFAULT '',
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxLargeViews" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_control_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_control_camera_businesses" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "cameraName" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_control_camera_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_control_user_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "farmControlName" TEXT,
    "requestedAt" TIMESTAMP(3),
    "lastSessionAt" TIMESTAMP(3),
    "lastRefusedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_control_user_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_camera_user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripVisible" BOOLEAN NOT NULL DEFAULT true,
    "stripCameraIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stripMode" TEXT NOT NULL DEFAULT 'live',
    "posStripMode" TEXT NOT NULL DEFAULT 'pictures',
    "showNamesOnStrip" BOOLEAN NOT NULL DEFAULT true,
    "showStripOnPos" BOOLEAN NOT NULL DEFAULT false,
    "cameraLabels" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_camera_user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farm_control_camera_businesses_businessId_idx" ON "farm_control_camera_businesses"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_control_camera_businesses_cameraId_businessId_key" ON "farm_control_camera_businesses"("cameraId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_control_user_links_userId_key" ON "farm_control_user_links"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_camera_user_preferences_userId_key" ON "farm_camera_user_preferences"("userId");

-- AddForeignKey
ALTER TABLE "farm_control_camera_businesses" ADD CONSTRAINT "farm_control_camera_businesses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_control_user_links" ADD CONSTRAINT "farm_control_user_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_camera_user_preferences" ADD CONSTRAINT "farm_camera_user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
