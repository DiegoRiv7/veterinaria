-- AlterTable
ALTER TABLE "Service" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'CLINICAL';

-- Bootstrap existing services that look aesthetic (baño, estética, corte de pelo,
-- grooming, uñas, spa) so the admin doesn't have to retag every row. The match is
-- case-insensitive on name and description.
UPDATE "Service"
SET "category" = 'AESTHETIC'
WHERE LOWER("name") LIKE '%baño%'
   OR LOWER("name") LIKE '%bano%'
   OR LOWER("name") LIKE '%estét%'
   OR LOWER("name") LIKE '%estet%'
   OR LOWER("name") LIKE '%corte%'
   OR LOWER("name") LIKE '%pelo%'
   OR LOWER("name") LIKE '%groom%'
   OR LOWER("name") LIKE '%peluquer%'
   OR LOWER("name") LIKE '%uñas%'
   OR LOWER("name") LIKE '%spa%';
