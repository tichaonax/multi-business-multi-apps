-- Marks the 51 clothing category 'group' rows created by
-- 20260908120001_group_clothing_categories with attributes.isGroup = true,
-- so category pickers that select a real leaf category (product edit,
-- add-stock, bulk-stock, quick-stock-from-scan, warehouse move) can filter
-- them out by default, while a future tree-style picker can still ask for
-- them via an explicit opt-in.
--
-- Matched by exact id (the same 51 ids the grouping migration created) so
-- this can never accidentally tag an unrelated leaf category that happens to
-- share a group's name.
--
-- Idempotent -- safe to re-run.

UPDATE business_categories
SET attributes = '{"isGroup": true}'::jsonb,
    "updatedAt" = NOW()
WHERE id IN ('9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', 'e88758ef-01d3-4503-be52-6a81787c411d', '5be86735-ca7a-4f5c-b636-aa81f0827961', '23015f08-c0f8-481a-995e-47caf540971f', 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', 'cb68f488-5fd7-4748-a728-b25e5001581a', '043666f5-321b-4f40-86e9-498e3706d4ae', '6e0214a4-3536-49b8-a78a-656aa5f005fd', 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', '030427c3-2419-4e43-9666-a8f7bccdd1d2', '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', 'b42c7b03-0df9-448e-8cba-87c6cd93e238', '26966690-9049-40d5-8ec0-0d13fdf4a131', 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', '30f25093-be33-4725-a358-25d910fb8bcb', '4e552184-1777-4c5c-8c20-03ca62d53111', '3ec886e4-13d5-4a50-a9e9-33981da9555f', '58dd31c8-51a0-496d-a481-feafe9aec825', '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', 'e23041d0-68b7-4efe-a676-8d5092e099f1', 'd7d88aca-a472-4fbf-a726-1540bc284674', '983460ef-137b-4541-bec6-24d1f3c9ac17', 'b25add42-0894-43a4-addc-164c3a88fcae', '0eda637d-b534-40fa-82f1-2615b9d5ba60', 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', 'f7b4e800-592b-417c-b991-a73b5c27fe17', 'efe21219-b636-4589-b627-37b2807add46', '0bfa39ba-1929-4913-a1d1-8c0188cffb64', '94f7ff62-307d-4b46-bca7-f5de06926753', '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', '499c7169-900e-4291-a02a-07e7d4edaaaf', '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', 'b86576bd-04c9-4719-8561-e48acc7a395b', '97dd1353-838c-40e5-84e1-96e0ae25522f', 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', '0ab575fe-7231-45e0-9eff-43d9f9923eed', '1f648f8c-6f6a-485c-b947-843b7eb206f5', '84ecad27-65ce-4f56-a989-718ad9ccf032', '5c2dc356-63b6-4b1e-be2e-425cad712918', '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', '494e7edb-ed24-43b3-8127-67fc57bbe307', 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', '9df85714-4a81-41da-9892-0689b4d7b45f', 'cab9adb0-855a-42be-bba2-71e872693db6', '2cc05b96-6d44-4beb-96b1-54b7a95a412b', 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
