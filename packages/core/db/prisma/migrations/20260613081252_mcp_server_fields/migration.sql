/*
  Warnings:

  - You are about to drop the column `connectedAt` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `McpServer` table. All the data in the column will be lost.
  - You are about to drop the column `serverUrl` on the `McpServer` table. All the data in the column will be lost.
  - Added the required column `url` to the `McpServer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "McpServer" DROP COLUMN "connectedAt",
DROP COLUMN "isActive",
DROP COLUMN "serverUrl",
ADD COLUMN     "connected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "url" TEXT NOT NULL;
