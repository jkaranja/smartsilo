import { PrismaPg } from "@prisma/adapter-pg";
import { type PoolConfig } from "pg";
import { PrismaClient } from "../.generated/prisma/client";

type DbConfig = PoolConfig;

export const prismaClient = (config: DbConfig): PrismaClient => {
  return new PrismaClient({
    adapter: new PrismaPg({
      ...config,
      options: config.options ?? "-c TimeZone=UTC",
    }),
  });
};
