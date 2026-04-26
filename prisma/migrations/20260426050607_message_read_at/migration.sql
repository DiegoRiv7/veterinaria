-- AlterTable
ALTER TABLE "Message" ADD COLUMN "readAt" DATETIME;

-- CreateIndex
CREATE INDEX "Message_senderId_readAt_idx" ON "Message"("senderId", "readAt");
