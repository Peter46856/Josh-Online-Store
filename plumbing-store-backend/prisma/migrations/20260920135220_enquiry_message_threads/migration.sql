/*
  Warnings:

  - You are about to drop the column `message` on the `Enquiry` table. All the data in the column will be lost.
  - You are about to drop the column `repliedAt` on the `Enquiry` table. All the data in the column will be lost.
  - You are about to drop the column `reply` on the `Enquiry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Enquiry" DROP COLUMN "message",
DROP COLUMN "repliedAt",
DROP COLUMN "reply";

-- CreateTable
CREATE TABLE "EnquiryMessage" (
    "id" SERIAL NOT NULL,
    "enquiryId" INTEGER NOT NULL,
    "senderRole" "Role" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EnquiryMessage" ADD CONSTRAINT "EnquiryMessage_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
