import { PrismaClient } from "@prisma/client";

// Global Prisma instance to prevent multiple connections in development
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("🔌 Disconnecting from database...");
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export { prisma };

// Database connection test
export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("🚀 PostgreSQL database connected successfully");

    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection test passed");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};
