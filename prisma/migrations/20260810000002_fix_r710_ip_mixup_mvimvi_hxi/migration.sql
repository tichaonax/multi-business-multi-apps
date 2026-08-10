-- MBM-257: Fix swapped R710 device IP addresses (Mvimvi <-> HXI)
--
-- r710_device_registry rows for "Mvimvi Store" and "Fashions HXI" (shared by
-- HXI Eats + HXI Fashions) had their ipAddress values swapped relative to the
-- physical routers they represent. Mvimvi's guest-WiFi tokens were being
-- generated on HXI's physical router (and vice versa), so Mvimvi tokens
-- couldn't be redeemed at the Mvimvi location and HXI Eats stopped being able
-- to generate tokens at all.
--
-- Correct mapping:
--   af71e7dd-e819-46de-9106-d598aabba489 (Mvimvi Store)  -> 192.168.1.77
--   9347efde-49ff-4501-8ea9-6cde1c20e2f5 (Fashions HXI)  -> 192.168.1.242
--
-- Swap uses a temporary placeholder value to satisfy the unique constraint
-- on ipAddress while both updates are pending. Only applies if the rows are
-- still in the known-bad state, so this migration is safe to run even if
-- someone already corrected the data by hand.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM r710_device_registry
    WHERE id = 'af71e7dd-e819-46de-9106-d598aabba489' AND "ipAddress" = '192.168.1.242'
  ) AND EXISTS (
    SELECT 1 FROM r710_device_registry
    WHERE id = '9347efde-49ff-4501-8ea9-6cde1c20e2f5' AND "ipAddress" = '192.168.1.77'
  ) THEN
    UPDATE r710_device_registry
      SET "ipAddress" = 'MBM-257-SWAP-TEMP'
      WHERE id = 'af71e7dd-e819-46de-9106-d598aabba489';

    UPDATE r710_device_registry
      SET "ipAddress" = '192.168.1.242'
      WHERE id = '9347efde-49ff-4501-8ea9-6cde1c20e2f5';

    UPDATE r710_device_registry
      SET "ipAddress" = '192.168.1.77'
      WHERE id = 'af71e7dd-e819-46de-9106-d598aabba489';

    -- Clear stale connection state so the next real test/health-check starts clean
    UPDATE r710_device_registry
      SET "connectionStatus" = 'DISCONNECTED', "lastError" = NULL
      WHERE id IN ('af71e7dd-e819-46de-9106-d598aabba489', '9347efde-49ff-4501-8ea9-6cde1c20e2f5');
  END IF;
END $$;
