-- 1:1 call booking: the Calendly event a student booked, or the times they suggested instead.
ALTER TABLE "MentorshipBooking" ADD COLUMN "calendlyEvent" TEXT;
ALTER TABLE "MentorshipBooking" ADD COLUMN "requestedTimes" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[];
ALTER TABLE "MentorshipBooking" ADD COLUMN "requestNote" TEXT NOT NULL DEFAULT '';
