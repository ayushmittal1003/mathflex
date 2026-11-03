-- A mobile number proven by OTP. Kept apart from "phone", which students type in without proof.
ALTER TABLE "User" ADD COLUMN "verifiedPhone" TEXT;
CREATE UNIQUE INDEX "User_verifiedPhone_key" ON "User"("verifiedPhone");
