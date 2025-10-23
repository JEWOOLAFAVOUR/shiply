const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Test database connection
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("🚀 PostgreSQL database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message || error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
  console.log("🔌 Database disconnected");
});

connectDB();

module.exports = { prisma };
