-- MBM-360: "My shortcuts" — the pages each user opens
CREATE TABLE "user_page_visits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_page_visits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_page_visits_userId_path_key" ON "user_page_visits"("userId", "path");
CREATE INDEX "user_page_visits_userId_idx" ON "user_page_visits"("userId");

ALTER TABLE "user_page_visits" ADD CONSTRAINT "user_page_visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
