/*
  Warnings:

  - You are about to drop the column `email_sent_detail_id` on the `EmailReceivers` table. All the data in the column will be lost.
  - You are about to drop the column `wa_number` on the `WaReceivers` table. All the data in the column will be lost.
  - You are about to drop the column `wa_sent_detail_id` on the `WaReceivers` table. All the data in the column will be lost.
  - You are about to drop the `EmailSentDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TelegramReceivers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TelegramSentDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WaSentDetails` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `wa_chat_id` to the `WaReceivers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EmailReceivers" DROP CONSTRAINT "EmailReceivers_email_sent_detail_id_fkey";

-- DropForeignKey
ALTER TABLE "EmailSentDetails" DROP CONSTRAINT "EmailSentDetails_report_platform_id_fkey";

-- DropForeignKey
ALTER TABLE "TelegramReceivers" DROP CONSTRAINT "TelegramReceivers_telegram_sent_detail_id_fkey";

-- DropForeignKey
ALTER TABLE "TelegramReceivers" DROP CONSTRAINT "TelegramReceivers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "TelegramSentDetails" DROP CONSTRAINT "TelegramSentDetails_report_platform_id_fkey";

-- DropForeignKey
ALTER TABLE "WaReceivers" DROP CONSTRAINT "WaReceivers_wa_sent_detail_id_fkey";

-- DropForeignKey
ALTER TABLE "WaSentDetails" DROP CONSTRAINT "WaSentDetails_report_platform_id_fkey";

-- DropIndex
DROP INDEX "EmailReceivers_email_email_sent_detail_id_key";

-- DropIndex
DROP INDEX "WaReceivers_wa_number_wa_sent_detail_id_key";

-- AlterTable
ALTER TABLE "DetectedAnomalies" ALTER COLUMN "video_path" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EmailReceivers" DROP COLUMN "email_sent_detail_id";

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "report_auto_send_email" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "report_auto_send_wa" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WaReceivers" DROP COLUMN "wa_number",
DROP COLUMN "wa_sent_detail_id",
ADD COLUMN     "is_group" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wa_chat_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "EmailSentDetails";

-- DropTable
DROP TABLE "TelegramReceivers";

-- DropTable
DROP TABLE "TelegramSentDetails";

-- DropTable
DROP TABLE "WaSentDetails";
