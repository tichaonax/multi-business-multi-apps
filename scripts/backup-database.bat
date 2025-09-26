@echo off
set PGPASSWORD=postgres
pg_dump -h localhost -p 5432 -U postgres -d multi_business_db > backups\multi-business-multi-apps-backup_database_pre_migration_%DATE:~-4,4%-%DATE:~-10,2%-%DATE:~-7,2%.sql
echo Database backup completed