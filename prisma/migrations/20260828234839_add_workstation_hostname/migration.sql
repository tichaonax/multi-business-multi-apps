-- MBM-283 follow-up: persist the workstation's actual machine hostname
-- (already sent on every connect handshake as hostLabel, previously only
-- logged) so a picker listing several workstations for one business can
-- disambiguate two that happen to share the same admin-typed label.
ALTER TABLE "workstation_agents" ADD COLUMN "hostname" TEXT;
