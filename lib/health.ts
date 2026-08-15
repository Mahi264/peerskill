import { prisma } from "@/lib/prisma";

export async function getDatabaseHealth() {
  const start = performance.now();

  await prisma.$queryRaw`SELECT 1`;

  const durationMs = Math.round(performance.now() - start);

  return {
    provider: "sqlite",
    reachable: true,
    durationMs,
  };
}
