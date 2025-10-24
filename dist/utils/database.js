"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const prisma = globalThis.prisma ||
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
    });
exports.prisma = prisma;
if (process.env.NODE_ENV !== "production") {
    globalThis.prisma = prisma;
}
// Graceful shutdown
const gracefulShutdown = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🔌 Disconnecting from database...");
    yield prisma.$disconnect();
    process.exit(0);
});
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
// Database connection test
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma.$connect();
        console.log("🚀 PostgreSQL database connected successfully");
        // Test the connection
        yield prisma.$queryRaw `SELECT 1`;
        console.log("✅ Database connection test passed");
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1);
    }
});
exports.connectDB = connectDB;
