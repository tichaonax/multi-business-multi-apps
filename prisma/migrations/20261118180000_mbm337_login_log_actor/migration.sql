-- MBM-337: who closed / switched a session that wasn't theirs
ALTER TABLE "employee_login_log" ADD COLUMN "actorEmployeeId" TEXT;

ALTER TABLE "employee_login_log"
  ADD CONSTRAINT "employee_login_log_actorEmployeeId_fkey"
  FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
