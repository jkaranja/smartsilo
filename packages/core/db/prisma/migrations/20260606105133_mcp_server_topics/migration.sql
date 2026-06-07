/*
  Warnings:

  - The `tools` column on the `McpServer` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "topics" JSONB[] DEFAULT ARRAY[]::JSONB[],
DROP COLUMN "tools",
ADD COLUMN     "tools" JSONB[] DEFAULT ARRAY[]::JSONB[];
