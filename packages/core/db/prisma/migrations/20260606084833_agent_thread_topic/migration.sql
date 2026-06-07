/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,userId,topic]` on the table `AgentThread` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AgentThread" ADD COLUMN     "lastBriefedAt" TIMESTAMP(3),
ADD COLUMN     "topic" TEXT NOT NULL DEFAULT 'general';

-- CreateIndex
CREATE UNIQUE INDEX "AgentThread_organizationId_userId_topic_key" ON "AgentThread"("organizationId", "userId", "topic");
