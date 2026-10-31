-- MBM-331: per-user "all businesses" camera access, set by a camera admin
ALTER TABLE "farm_control_user_links" ADD COLUMN "viewAllBusinesses" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "farm_control_user_links" ADD COLUMN "captureAllBusinesses" BOOLEAN NOT NULL DEFAULT false;
