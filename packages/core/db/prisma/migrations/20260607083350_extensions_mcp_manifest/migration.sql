/*
  Warnings:

  - The values [CLINIC,DEALERSHIP] on the enum `Industry` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `topic` on the `AgentThread` table. All the data in the column will be lost.
  - You are about to drop the column `topics` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the `ClinicAppointment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClinicMedication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClinicPatient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerSalesDeal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerTradeIn` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerVehicleListing` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[organizationId,userId,context]` on the table `AgentThread` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Industry_new" AS ENUM ('GARAGE');
ALTER TABLE "Organization" ALTER COLUMN "industry" TYPE "Industry_new" USING ("industry"::text::"Industry_new");
ALTER TYPE "Industry" RENAME TO "Industry_old";
ALTER TYPE "Industry_new" RENAME TO "Industry";
DROP TYPE "public"."Industry_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ClinicAppointment" DROP CONSTRAINT "ClinicAppointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "ClinicAppointment" DROP CONSTRAINT "ClinicAppointment_physicianId_fkey";

-- DropForeignKey
ALTER TABLE "DealerSalesDeal" DROP CONSTRAINT "DealerSalesDeal_listingId_fkey";

-- DropForeignKey
ALTER TABLE "DealerTradeIn" DROP CONSTRAINT "DealerTradeIn_listingId_fkey";

-- DropIndex
DROP INDEX "AgentThread_organizationId_userId_topic_key";

-- AlterTable
ALTER TABLE "AgentThread" DROP COLUMN "topic",
ADD COLUMN     "context" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "McpServer" DROP COLUMN "topics",
ADD COLUMN     "manifest" JSONB;

-- DropTable
DROP TABLE "ClinicAppointment";

-- DropTable
DROP TABLE "ClinicMedication";

-- DropTable
DROP TABLE "ClinicPatient";

-- DropTable
DROP TABLE "DealerSalesDeal";

-- DropTable
DROP TABLE "DealerTradeIn";

-- DropTable
DROP TABLE "DealerVehicleListing";

-- DropEnum
DROP TYPE "AppointmentStatus";

-- CreateIndex
CREATE UNIQUE INDEX "AgentThread_organizationId_userId_context_key" ON "AgentThread"("organizationId", "userId", "context");
