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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerBuildService = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const stream_1 = require("stream");
const dockerBuilder_1 = require("./dockerBuilder");
class DockerBuildService {
    constructor() {
        // Initialize Docker connection
        this.docker = new dockerode_1.default();
    }
    /**
     * Build Docker image from project
     */
    buildProject(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const buildLogs = [];
            try {
                buildLogs.push(`🚀 Starting build for project: ${options.projectId}`);
                // Step 0: Check Docker connection
                console.log("🔍 Checking Docker connection...");
                const dockerAvailable = yield this.checkDockerConnection();
                if (!dockerAvailable) {
                    throw new Error("Docker is not available. Please ensure Docker Desktop is running.");
                }
                console.log("✅ Docker connection successful");
                buildLogs.push(`🐳 Docker connection verified`);
                // Step 1: Detect framework and generate Dockerfile
                console.log("🔍 Detecting framework...");
                const framework = yield dockerBuilder_1.DockerfileGenerator.detectFramework(options.projectPath);
                console.log("📦 Framework detected:", framework.name);
                buildLogs.push(`📦 Detected framework: ${framework.name}`);
                // Step 2: Generate necessary files
                console.log("📝 Generating Docker files...");
                yield this.generateDockerFiles(options.projectPath, framework);
                console.log("✅ Docker files generated");
                buildLogs.push(`📝 Generated Docker configuration files`);
                // Step 3: Create build context (tar archive)
                console.log("📚 Creating build context...");
                const buildContext = yield this.createBuildContext(options.projectPath);
                console.log("✅ Build context created");
                buildLogs.push(`📚 Created build context`);
                // Step 4: Build Docker image
                const imageName = `${options.imageName}:${options.imageTag || "latest"}`;
                console.log("🔨 Starting Docker image build:", imageName);
                buildLogs.push(`🔨 Building Docker image: ${imageName}`);
                const buildResult = yield this.buildDockerImage(buildContext, imageName, buildLogs);
                if (buildResult.success) {
                    console.log("✅ Docker build completed successfully!");
                    buildLogs.push(`✅ Build completed successfully`);
                    buildLogs.push(`🏷️  Image ID: ${buildResult.imageId}`);
                }
                else {
                    console.error("❌ Docker build failed:", buildResult.error);
                }
                return {
                    success: buildResult.success,
                    imageId: buildResult.imageId,
                    imageName: imageName,
                    buildLogs: buildLogs,
                    error: buildResult.error,
                };
            }
            catch (error) {
                console.error("❌ Build process failed:", error);
                buildLogs.push(`❌ Build failed: ${error.message}`);
                return {
                    success: false,
                    imageName: `${options.imageName}:${options.imageTag || "latest"}`,
                    buildLogs: buildLogs,
                    error: error.message,
                };
            }
        });
    }
    /**
     * Generate Docker-related files
     */
    generateDockerFiles(projectPath, framework) {
        return __awaiter(this, void 0, void 0, function* () {
            const dockerDir = path_1.default.join(projectPath, "docker");
            yield fs_extra_1.default.ensureDir(dockerDir);
            // Generate Dockerfile
            const dockerfile = dockerBuilder_1.DockerfileGenerator.generateDockerfile(framework);
            yield fs_extra_1.default.writeFile(path_1.default.join(projectPath, "Dockerfile"), dockerfile);
            // Generate .dockerignore
            const dockerignore = dockerBuilder_1.DockerfileGenerator.generateDockerignore();
            yield fs_extra_1.default.writeFile(path_1.default.join(projectPath, ".dockerignore"), dockerignore);
            // Generate nginx config for static sites
            if (["react-cra", "react-vite", "vue-cli", "vue-vite", "static"].includes(framework.name)) {
                const nginxConfig = dockerBuilder_1.DockerfileGenerator.generateNginxConfig();
                yield fs_extra_1.default.writeFile(path_1.default.join(dockerDir, "nginx.conf"), nginxConfig);
            }
        });
    }
    /**
     * Create build context as a tar stream
     */
    createBuildContext(projectPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const archive = (0, archiver_1.default)("tar", {
                    gzip: false,
                });
                const stream = new stream_1.Readable();
                stream._read = () => { };
                archive.on("data", (chunk) => {
                    stream.push(chunk);
                });
                archive.on("end", () => {
                    stream.push(null);
                });
                archive.on("error", (err) => {
                    reject(err);
                });
                // Add all files except those in .dockerignore
                archive.directory(projectPath, false);
                archive.finalize();
                resolve(stream);
            });
        });
    }
    /**
     * Build Docker image using Docker API
     */
    buildDockerImage(buildContext, imageName, buildLogs) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                console.log("🐳 Starting Docker build process...");
                console.log("Image name:", imageName);
                // Set a timeout for the build process (5 minutes)
                const buildTimeout = setTimeout(() => {
                    console.error("❌ Docker build timeout after 5 minutes");
                    buildLogs.push("❌ Build timeout after 5 minutes");
                    resolve({ success: false, error: "Build timeout after 5 minutes" });
                }, 5 * 60 * 1000); // 5 minutes
                this.docker.buildImage(buildContext, {
                    t: imageName,
                    dockerfile: "Dockerfile",
                    rm: true, // Remove intermediate containers
                    forcerm: true, // Always remove intermediate containers
                    pull: false, // Don't pull base image unless necessary (much faster!)
                    nocache: false, // Use build cache for faster builds
                }, (err, stream) => {
                    if (err) {
                        console.error("❌ Docker build error:", err);
                        buildLogs.push(`❌ Docker build error: ${err.message}`);
                        return resolve({ success: false, error: err.message });
                    }
                    if (!stream) {
                        console.error("❌ No build stream received from Docker");
                        buildLogs.push("❌ No build stream received from Docker");
                        return resolve({
                            success: false,
                            error: "No build stream received",
                        });
                    }
                    let imageId;
                    let buildCompleted = false;
                    console.log("📜 Monitoring Docker build stream...");
                    // Parse build output
                    stream.on("data", (chunk) => {
                        const chunkStr = chunk.toString();
                        console.log("📝 Docker build chunk:", chunkStr);
                        const lines = chunkStr.split("\n").filter(Boolean);
                        for (const line of lines) {
                            try {
                                const data = JSON.parse(line);
                                if (data.stream) {
                                    const logMsg = data.stream.trim();
                                    console.log("🐳 Docker:", logMsg);
                                    buildLogs.push(logMsg);
                                }
                                if (data.aux && data.aux.ID) {
                                    imageId = data.aux.ID;
                                    console.log("🏷️  Image ID received:", imageId);
                                }
                                if (data.error) {
                                    console.error("❌ Docker build error in stream:", data.error);
                                    buildLogs.push(`❌ ${data.error}`);
                                    return resolve({ success: false, error: data.error });
                                }
                                if (data.stream && data.stream.includes("Successfully built")) {
                                    buildCompleted = true;
                                    console.log("✅ Docker build completed successfully");
                                }
                            }
                            catch (parseErr) {
                                console.log("⚠️  Failed to parse JSON line:", line);
                                // Still add raw line to logs
                                buildLogs.push(line);
                            }
                        }
                    });
                    stream.on("end", () => {
                        clearTimeout(buildTimeout); // Clear the timeout
                        console.log("📜 Docker build stream ended");
                        console.log("Build completed:", buildCompleted);
                        console.log("Image ID:", imageId);
                        if (imageId || buildCompleted) {
                            console.log("✅ Build successful with image ID:", imageId);
                            resolve({ success: true, imageId });
                        }
                        else {
                            console.error("❌ Build completed but no image ID received");
                            resolve({
                                success: false,
                                error: "Build completed but no image ID received",
                            });
                        }
                    });
                    stream.on("error", (streamErr) => {
                        clearTimeout(buildTimeout); // Clear the timeout
                        console.error("❌ Docker stream error:", streamErr);
                        buildLogs.push(`❌ Stream error: ${streamErr.message}`);
                        resolve({ success: false, error: streamErr.message });
                    });
                });
            });
        });
    }
    /**
     * List Docker images
     */
    listImages() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.docker.listImages();
        });
    }
    /**
     * Remove Docker image
     */
    removeImage(imageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const image = this.docker.getImage(imageId);
                yield image.remove({ force: true });
                return true;
            }
            catch (error) {
                console.error("Error removing image:", error);
                return false;
            }
        });
    }
    /**
     * Get image details
     */
    inspectImage(imageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const image = this.docker.getImage(imageId);
                return yield image.inspect();
            }
            catch (error) {
                console.error("Error inspecting image:", error);
                return null;
            }
        });
    }
    /**
     * Check if Docker is available
     */
    checkDockerConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.docker.ping();
                return true;
            }
            catch (error) {
                console.error("Docker connection failed:", error);
                return false;
            }
        });
    }
}
exports.DockerBuildService = DockerBuildService;
