DROP TABLE IF EXISTS "user" CASCADE;
DROP TYPE IF EXISTS "role";

CREATE TYPE "Role" AS ENUM ('PARTICIPANT', 'SPECIAL_GUEST', 'STARTUP', 'ADMIN', 'DISPLAY');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'PARTICIPANT',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "sessions" (
  "token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("token")
);

CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

CREATE TABLE "timeline_items" (
  "id" SERIAL NOT NULL,
  "day_label" TEXT NOT NULL,
  "event_date" TEXT NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "venue" TEXT NOT NULL,
  "speaker" TEXT,
  "description" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "timeline_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "timeline_items_event_date_sort_order_idx" ON "timeline_items"("event_date", "sort_order");

CREATE TABLE "rooms" (
  "id" SERIAL NOT NULL,
  "hostel" TEXT NOT NULL,
  "room_number" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rooms_hostel_room_number_key" ON "rooms"("hostel", "room_number");

CREATE TABLE "room_allotments" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "room_id" INTEGER NOT NULL,
  "assigned_by_id" TEXT,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "room_allotments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "room_allotments_user_id_key" ON "room_allotments"("user_id");
CREATE INDEX "room_allotments_room_id_idx" ON "room_allotments"("room_id");

CREATE TABLE "food_coupons" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "food_coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "food_coupons_user_id_key" ON "food_coupons"("user_id");
CREATE UNIQUE INDEX "food_coupons_code_key" ON "food_coupons"("code");

CREATE TABLE "poll_questions" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" TEXT,
  CONSTRAINT "poll_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "poll_options" (
  "id" SERIAL NOT NULL,
  "question_id" TEXT NOT NULL,
  "option_text" TEXT NOT NULL,
  "votes" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "poll_options_question_id_idx" ON "poll_options"("question_id");

CREATE TABLE "poll_votes" (
  "id" SERIAL NOT NULL,
  "question_id" TEXT NOT NULL,
  "option_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "poll_votes_question_id_user_id_key" ON "poll_votes"("question_id", "user_id");
CREATE INDEX "poll_votes_user_id_idx" ON "poll_votes"("user_id");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_allotments" ADD CONSTRAINT "room_allotments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_allotments" ADD CONSTRAINT "room_allotments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_allotments" ADD CONSTRAINT "room_allotments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "food_coupons" ADD CONSTRAINT "food_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_questions" ADD CONSTRAINT "poll_questions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "poll_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "poll_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
