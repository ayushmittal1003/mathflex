-- Guest checkout: an order can be paid before its buyer has an account. It stays unattached until
-- the buyer proves the email (Google) or number (OTP) saved here.
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN "contactPhone" TEXT;
CREATE INDEX "Order_contactEmail_idx" ON "Order"("contactEmail");
CREATE INDEX "Order_contactPhone_idx" ON "Order"("contactPhone");
