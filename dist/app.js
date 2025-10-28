"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
require("express-async-errors");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const pino_1 = __importDefault(require("pino"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const userRoute_1 = __importDefault(require("./routers/auth-route/userRoute"));
const projectRoute_1 = __importDefault(require("./routers/project-route/projectRoute"));
const deploymentRoute_1 = __importDefault(require("./routers/deployment-route/deploymentRoute"));
require("./db"); // This will initialize the database connection
const expressSanitizer = require("express-sanitizer");
dotenv_1.default.config();
const requiredEnvVars = ["JWT_SECRET", "NODE_ENV"];
requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
        console.error(`⚠️ Required environment variable ${envVar} is not set!`);
        process.exit(1);
    }
});
// Initialize Express app
const app = (0, express_1.default)();
// Setup logging
const isProduction = process.env.NODE_ENV === "production";
const logDir = path_1.default.join(__dirname, "./logs");
// Create logs directory if it doesn't exist
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
// Configure file logger that works in all environments
const logFile = path_1.default.join(logDir, "app.log");
const fileStream = fs_1.default.createWriteStream(logFile, { flags: "a" });
// Create a simple file logger for Morgan
const morganFileLogger = {
    write: (message) => {
        fileStream.write(message);
    },
};
// Original Pino logger
const pinoLogger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || "info",
    transport: !isProduction ? { target: "pino-pretty" } : undefined,
});
// Create a wrapper logger that also writes to file
const logger = {
    info: (...args) => {
        const message = args.length > 0 ? args[0].toString() : "No message provided";
        return pinoLogger.info(message, ...args.slice(1));
    },
    error: (...args) => {
        const message = args.length > 0 ? args[0].toString() : "No message provided";
        return pinoLogger.error(message, ...args.slice(1));
    },
    warn: (...args) => {
        const message = args.length > 0 ? args[0].toString() : "No message provided";
        return pinoLogger.warn(message, ...args.slice(1));
    },
    debug: (...args) => {
        const message = args.length > 0 ? args[0].toString() : "No message provided";
        return pinoLogger.debug(message, ...args.slice(1));
    },
    trace: (...args) => {
        const message = args.length > 0 ? args[0].toString() : "No message provided";
        return pinoLogger.trace(message, ...args.slice(1));
    },
    fatal: (...args) => {
        const message = args.length > 0 ? args[0].toString() : "No message provided";
        return pinoLogger.fatal(message, ...args.slice(1));
    },
};
// Rate limiting configuration
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skipSuccessfulRequests: false, // Count all requests
});
// More aggressive rate limiting for authentication endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: {
        error: "Too many authentication attempts, please try again later.",
    },
});
// Configure CORS options
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Length", "X-Request-ID"],
    credentials: true,
    maxAge: 86400, // 24 hours
};
// Middleware
app.set("trust proxy", 1); // Trust first proxy (for rate limiting behind reverse proxy)
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: "2mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "2mb" }));
app.use((0, helmet_1.default)({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: isProduction,
}));
app.use((0, compression_1.default)());
app.use(expressSanitizer());
// Add request ID to each request
app.use((req, res, next) => {
    const requestId = req.headers["x-request-id"] || (0, uuid_1.v4)();
    req.requestId = requestId.toString();
    res.setHeader("X-Request-ID", req.requestId);
    next();
});
// Use Morgan for console logging
app.use((0, morgan_1.default)(":method :url :status :response-time ms"));
// Also log HTTP requests to file
app.use((0, morgan_1.default)(":method :url :status :response-time ms", {
    stream: morganFileLogger,
}));
// Global rate limiter
app.use(limiter);
// Apply specific rate limits to auth routes
app.use("/api/v1/auth", authLimiter);
// Health check endpoint (no authentication required)
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version,
    });
});
// Error handling middleware - fixed TypeScript error
app.use((err, req, res, next) => {
    if (err.name === "UnauthorizedError") {
        res.status(401).json({ error: "Invalid token or not authenticated" });
    }
    else {
        next(err);
    }
});
// Global error handling middleware
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message} (${req.method} ${req.originalUrl})`);
    const statusCode = "statusCode" in err ? err.statusCode : 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === "production"
            ? "An unexpected error occurred"
            : err.message,
        requestId: req.requestId,
    });
});
// api request
app.use("/api/v1/auth", userRoute_1.default);
app.use("/api/v1/projects", projectRoute_1.default);
app.use("/api/v1", deploymentRoute_1.default);
// Handle 404 routes
app.use((req, res) => {
    res
        .status(404)
        .json({ error: "Route not found", message: "Route not found" });
});
// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
// Graceful shutdown handling
process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    server.close(() => {
        logger.info("Server closed");
        process.exit(0);
    });
});
// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    fileStream.write(`[${new Date().toISOString()}] FATAL: Uncaught Exception: ${err.message}\n${err.stack}\n`);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    fileStream.write(`[${new Date().toISOString()}] FATAL: Unhandled Rejection: ${reason}\n`);
    process.exit(1);
});
exports.default = app;
