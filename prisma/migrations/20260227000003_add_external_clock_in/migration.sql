-- CreateTable: ExternalClockIn
-- Tracks clock-in/out for non-employees: contractors (linked to Persons) and visitors (name only)

CREATE TABLE "external_clock_in" (
    "id"          TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "personId"    TEXT,
    "visitorName" TEXT,
    "businessId"  TEXT NOT NULL,
    "date"        TIMESTAMP(3) NOT NULL,
    "clockIn"     TIMESTAMP(3),
    "clockOut"    TIMESTAMP(3),
    "hoursWorked" DECIMAL(6,2),
    "notes"       TEXT,
    "createdBy"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_clock_in_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "external_clock_in" ADD CONSTRAINT "external_clock_in_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
