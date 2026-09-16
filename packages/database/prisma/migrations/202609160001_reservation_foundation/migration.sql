-- Month 1 reservation foundation. Additive only; do not reset existing data.
BEGIN;

CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'CONVERTED');
CREATE TYPE "ReservationEventType" AS ENUM ('CREATED', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'CONVERTED', 'NOTE');

CREATE TABLE "reservations" (
  "id" UUID NOT NULL,
  "reservation_number" TEXT NOT NULL,
  "customer_id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "confirmed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "converted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservation_events" (
  "id" UUID NOT NULL,
  "reservation_id" UUID NOT NULL,
  "event_type" "ReservationEventType" NOT NULL,
  "actor_user_id" UUID,
  "note" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservation_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_status_history" (
  "id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "previous_status" "PropertyStatus",
  "next_status" "PropertyStatus" NOT NULL,
  "reason" TEXT,
  "actor_user_id" UUID,
  "reservation_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reservations_reservation_number_key" ON "reservations"("reservation_number");
CREATE INDEX "reservations_customer_id_status_idx" ON "reservations"("customer_id", "status");
CREATE INDEX "reservations_property_id_status_idx" ON "reservations"("property_id", "status");
CREATE INDEX "reservations_expires_at_status_idx" ON "reservations"("expires_at", "status");

-- At most one active reservation workflow per property. Converted history is retained.
CREATE UNIQUE INDEX "reservations_one_active_property_key"
  ON "reservations"("property_id")
  WHERE "status" IN ('PENDING', 'CONFIRMED');

CREATE INDEX "reservation_events_reservation_id_created_at_idx" ON "reservation_events"("reservation_id", "created_at");
CREATE INDEX "reservation_events_actor_user_id_idx" ON "reservation_events"("actor_user_id");
CREATE INDEX "property_status_history_property_id_created_at_idx" ON "property_status_history"("property_id", "created_at");
CREATE INDEX "property_status_history_actor_user_id_idx" ON "property_status_history"("actor_user_id");

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_status_history" ADD CONSTRAINT "property_status_history_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "property_status_history" ADD CONSTRAINT "property_status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_status_history" ADD CONSTRAINT "property_status_history_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservation_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_status_history" ENABLE ROW LEVEL SECURITY;

COMMIT;
