-- Manual migration for legacy timestamp columns:
-- create_at  -> created_at
-- update_at  -> updated_at
--
-- This script is idempotent and safe to run multiple times.

BEGIN;

DO $$
BEGIN
    -- Users: create_at/date -> created_at/timestamp, update_at/date -> updated_at/timestamp
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Users' AND column_name = 'create_at'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Users' AND column_name = 'created_at'
    ) THEN
        UPDATE "Users"
        SET "created_at" = COALESCE("created_at", "create_at"::timestamp)
        WHERE "create_at" IS NOT NULL;

        ALTER TABLE "Users" DROP COLUMN IF EXISTS "create_at";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Users' AND column_name = 'update_at'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Users' AND column_name = 'updated_at'
    ) THEN
        UPDATE "Users"
        SET "updated_at" = COALESCE("updated_at", "update_at"::timestamp)
        WHERE "update_at" IS NOT NULL;

        ALTER TABLE "Users" DROP COLUMN IF EXISTS "update_at";
    END IF;

    -- Complaint: create_at/date -> created_at/timestamp
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Complaint' AND column_name = 'create_at'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Complaint' AND column_name = 'created_at'
    ) THEN
        UPDATE "Complaint"
        SET "created_at" = COALESCE("created_at", "create_at"::timestamp)
        WHERE "create_at" IS NOT NULL;

        ALTER TABLE "Complaint" DROP COLUMN IF EXISTS "create_at";
    END IF;

    -- Feedback: create_at/time -> created_at/timestamp
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Feedback' AND column_name = 'create_at'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Feedback' AND column_name = 'created_at'
    ) THEN
        UPDATE "Feedback"
        SET "created_at" = COALESCE("created_at", (CURRENT_DATE + "create_at")::timestamp)
        WHERE "create_at" IS NOT NULL;

        ALTER TABLE "Feedback" DROP COLUMN IF EXISTS "create_at";
    END IF;
END $$;

COMMIT;
