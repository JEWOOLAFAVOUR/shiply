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
const deployment_1 = require("../../models/deployment/deployment");
const project_1 = require("../../models/project/project");
const helper_1 = require("../../utils/helper");
// import { CustomRequest } from "../../utils/types";
const dockerBuildService_1 = require("../../services/dockerBuildService");
const containerManager_1 = require("../../services/containerManager");
const nginxConfigManager_1 = require("../../services/nginxConfigManager");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
// Multer configuration for file uploads
const upload = (0, multer_1.default)({
    dest: "uploads/",
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow zip files and common project files
        const allowedMimes = [
            "application/zip",
            "application/x-zip-compressed",
            "application/octet-stream",
        ];
        if (allowedMimes.includes(file.mimetype) ||
            file.originalname.endsWith(".zip")) {
            cb(null, true);
        }
        else {
            cb(new Error("Only ZIP files are allowed"));
        }
    },
});
// Initialize services
const dockerBuilder = new dockerBuildService_1.DockerBuildService();
const containerManager = new containerManager_1.ContainerManager();
const nginxConfigManager = new nginxConfigManager_1.NginxConfigManager();
// Deploy a project
const deployProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const { version, memoryLimit, cpuLimit } = req.body;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        // Check if project exists and user owns it
        const project = yield project_1.Project.findById(projectId);
        if (!project) {
            return (0, helper_1.sendError)(res, 404, "Project not found");
        }
        if (project.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this project");
        }
        // Check if file was uploaded
        if (!req.file) {
            return (0, helper_1.sendError)(res, 400, "Project file (ZIP) is required");
        }
        // Create deployment record
        const deployment = yield deployment_1.Deployment.create({
            version: version || `v${Date.now()}`,
            status: "PENDING",
            projectId,
            userId,
            memoryLimit: memoryLimit ? parseInt(memoryLimit) : 512,
            cpuLimit: cpuLimit ? parseInt(cpuLimit) : 1024,
        });
        // Set project status to building
        yield project_1.Project.updateStatus(projectId, "BUILDING");
        // Start deployment process asynchronously
        processDeployment(deployment.id, req.file.path, project, deployment).catch((error) => {
            console.error("Deployment process error:", error);
        });
        res.status(201).json({
            success: true,
            message: "Deployment started successfully",
            data: deployment,
        });
    }
    catch (error) {
        console.error("Deploy project error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Process deployment asynchronously
function processDeployment(deploymentId, uploadPath, project, deployment) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const workDir = path_1.default.join(process.cwd(), "temp", deploymentId);
        try {
            console.log("\n==== DEPLOYMENT PROCESS STARTED ====");
            console.log("Deployment ID:", deploymentId);
            console.log("Upload path:", uploadPath);
            console.log("Work directory:", workDir);
            console.log("Project:", {
                id: project.id,
                name: project.name,
                framework: project.framework,
            });
            // Update status to building
            yield deployment_1.Deployment.updateStatus(deploymentId, "BUILDING");
            console.log("Status updated to BUILDING");
            // Check if uploaded file exists
            console.log("\n--- CHECKING UPLOADED FILE ---");
            const uploadExists = yield fs_extra_1.default.pathExists(uploadPath);
            console.log("Upload file exists:", uploadExists);
            if (uploadExists) {
                const uploadStats = yield fs_extra_1.default.stat(uploadPath);
                console.log("Upload file size:", uploadStats.size, "bytes");
            }
            // Extract uploaded ZIP file
            console.log("\n--- EXTRACTING ZIP FILE ---");
            console.log("Extracting from:", uploadPath);
            console.log("Extracting to:", workDir);
            yield extractZipFile(uploadPath, workDir);
            console.log("ZIP extraction completed");
            // Check what was extracted and find the correct project path
            console.log("\n--- CHECKING EXTRACTED CONTENTS ---");
            const workDirExists = yield fs_extra_1.default.pathExists(workDir);
            console.log("Work directory exists:", workDirExists);
            let actualProjectPath = workDir;
            let packageJsonFound = false;
            if (workDirExists) {
                const extractedFiles = yield fs_extra_1.default.readdir(workDir);
                console.log("Extracted files/folders:", extractedFiles);
                // Check for package.json in root
                const packageJsonPath = path_1.default.join(workDir, "package.json");
                const packageJsonExists = yield fs_extra_1.default.pathExists(packageJsonPath);
                console.log("package.json exists in root:", packageJsonExists);
                if (packageJsonExists) {
                    actualProjectPath = workDir;
                    packageJsonFound = true;
                    console.log("✅ Using root directory as project path");
                }
                else if (extractedFiles.length > 0) {
                    // Check if there's a subdirectory containing the project
                    console.log("🔍 Searching for package.json in subdirectories...");
                    for (const item of extractedFiles) {
                        const itemPath = path_1.default.join(workDir, item);
                        const itemStat = yield fs_extra_1.default.stat(itemPath);
                        if (itemStat.isDirectory()) {
                            console.log(`Checking subdirectory: ${item}`);
                            const subDirFiles = yield fs_extra_1.default.readdir(itemPath);
                            console.log(`Files in ${item}:`, subDirFiles);
                            const subPackageJson = path_1.default.join(itemPath, "package.json");
                            const subPackageJsonExists = yield fs_extra_1.default.pathExists(subPackageJson);
                            console.log(`package.json in ${item}:`, subPackageJsonExists);
                            if (subPackageJsonExists) {
                                actualProjectPath = itemPath;
                                packageJsonFound = true;
                                console.log(`✅ Found package.json in subdirectory: ${item}`);
                                console.log(`✅ Using ${item} as project path: ${actualProjectPath}`);
                                break;
                            }
                        }
                    }
                }
                if (!packageJsonFound) {
                    throw new Error("No package.json found in the uploaded project. Please ensure your ZIP file contains a valid Node.js project with package.json.");
                }
            }
            // Build Docker image
            console.log("\n--- BUILDING DOCKER IMAGE ---");
            // Create Docker-compliant image name (lowercase, no spaces, only valid characters)
            const sanitizedProjectName = project.name
                .toLowerCase()
                .replace(/[^a-z0-9-_.]/g, "-") // Replace invalid characters with hyphens
                .replace(/-+/g, "-") // Replace multiple consecutive hyphens with single hyphen
                .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
            const imageName = `shiply/${sanitizedProjectName}-${project.userId}`;
            console.log("Original project name:", project.name);
            console.log("Sanitized project name:", sanitizedProjectName);
            console.log("Final image name:", imageName);
            console.log("Image tag:", deployment.version);
            console.log("Actual project path for build:", actualProjectPath);
            const buildResult = yield dockerBuilder.buildProject({
                projectId: project.id,
                userId: project.userId,
                projectPath: actualProjectPath,
                imageName: imageName,
                imageTag: deployment.version,
            });
            console.log("Build result:", {
                success: buildResult.success,
                imageId: buildResult.imageId,
                imageName: buildResult.imageName,
                buildLogsLength: ((_a = buildResult.buildLogs) === null || _a === void 0 ? void 0 : _a.length) || 0,
            });
            // Update deployment with build logs
            yield deployment_1.Deployment.update(deploymentId, {
                buildLogs: buildResult.buildLogs.join("\n"),
                dockerImageId: buildResult.imageId,
                dockerImageName: buildResult.imageName,
            });
            if (!buildResult.success) {
                yield deployment_1.Deployment.updateStatus(deploymentId, "FAILED");
                yield project_1.Project.updateStatus(project.id, "ERROR");
                return;
            }
            // Deploy container
            const containerName = `${sanitizedProjectName}-${project.userId}-${deployment.version}`;
            console.log("Container name:", containerName);
            const containerConfig = {
                imageId: buildResult.imageId,
                imageName: buildResult.imageName,
                containerName: containerName,
                port: getPortForFramework(project.framework),
                memoryLimit: deployment.memoryLimit || 512,
                cpuLimit: deployment.cpuLimit || 1024,
            };
            const containerInfo = yield containerManager.deployContainer(containerConfig);
            // Get assigned host port
            const hostPort = ((_b = containerInfo.ports.find((p) => p.Type === "tcp")) === null || _b === void 0 ? void 0 : _b.PublicPort) || 0;
            // Configure Nginx reverse proxy for custom domain
            const subdomain = sanitizedProjectName; // Already sanitized above
            const customUrl = `http://${subdomain}.shiply.local`;
            console.log(`🌐 Setting up reverse proxy: ${customUrl} → localhost:${hostPort}`);
            // Add nginx route for the deployed app
            yield nginxConfigManager.addAppRoute({
                appName: sanitizedProjectName,
                subdomain: subdomain,
                port: hostPort,
                containerName: containerName,
            });
            // Notify user about host entry
            yield nginxConfigManager.addHostEntry(subdomain);
            console.log(`✅ App deployed and accessible at: ${customUrl}`);
            // Update deployment with container info
            yield deployment_1.Deployment.update(deploymentId, {
                containerName: containerName,
                containerPort: containerConfig.port,
                hostPort: hostPort,
                containerStatus: containerInfo.state,
                deployUrl: customUrl, // Use custom domain instead of localhost
                status: "SUCCESS",
            });
            // Update project status
            yield project_1.Project.updateStatus(project.id, "ACTIVE");
        }
        catch (error) {
            console.error("Deployment process failed:", error);
            // Update deployment as failed
            yield deployment_1.Deployment.update(deploymentId, {
                buildLogs: `Deployment failed: ${error.message}`,
                status: "FAILED",
            });
            yield project_1.Project.updateStatus(project.id, "ERROR");
        }
        finally {
            // Cleanup
            try {
                yield fs_extra_1.default.remove(uploadPath);
                yield fs_extra_1.default.remove(workDir);
            }
            catch (cleanupError) {
                console.error("Cleanup error:", cleanupError);
            }
        }
    });
}
// Get deployment details
const getDeployment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deploymentId } = req.params;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        const deployment = yield deployment_1.Deployment.findById(deploymentId);
        if (!deployment) {
            return (0, helper_1.sendError)(res, 404, "Deployment not found");
        }
        if (deployment.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this deployment");
        }
        res.status(200).json({
            success: true,
            message: "Deployment retrieved successfully",
            data: deployment,
        });
    }
    catch (error) {
        console.error("Get deployment error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Get deployments for a project
const getProjectDeployments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        // Check if project exists and user owns it
        const project = yield project_1.Project.findById(projectId);
        if (!project) {
            return (0, helper_1.sendError)(res, 404, "Project not found");
        }
        if (project.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this project");
        }
        const deployments = yield deployment_1.Deployment.findByProjectId(projectId);
        res.status(200).json({
            success: true,
            message: "Deployments retrieved successfully",
            data: deployments,
        });
    }
    catch (error) {
        console.error("Get project deployments error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Get deployment logs
const getDeploymentLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deploymentId } = req.params;
        const { tail } = req.query;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        const deployment = yield deployment_1.Deployment.findById(deploymentId);
        if (!deployment) {
            return (0, helper_1.sendError)(res, 404, "Deployment not found");
        }
        if (deployment.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this deployment");
        }
        let logs = [];
        // Get build logs
        if (deployment.buildLogs) {
            logs.push("=== BUILD LOGS ===");
            logs.push(...deployment.buildLogs.split("\n"));
        }
        // Get container logs if container exists
        if (deployment.containerName) {
            logs.push("=== CONTAINER LOGS ===");
            const containerLogs = yield containerManager.getContainerLogs(deployment.containerName, tail ? parseInt(tail) : 100);
            logs.push(...containerLogs);
        }
        res.status(200).json({
            success: true,
            message: "Logs retrieved successfully",
            data: { logs },
        });
    }
    catch (error) {
        console.error("Get deployment logs error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Stop deployment (stop container)
const stopDeployment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deploymentId } = req.params;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        const deployment = yield deployment_1.Deployment.findById(deploymentId);
        if (!deployment) {
            return (0, helper_1.sendError)(res, 404, "Deployment not found");
        }
        if (deployment.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this deployment");
        }
        if (!deployment.containerName) {
            return (0, helper_1.sendError)(res, 400, "No container associated with this deployment");
        }
        // Stop container
        const stopped = yield containerManager.stopContainer(deployment.containerName);
        if (!stopped) {
            return (0, helper_1.sendError)(res, 500, "Failed to stop container");
        }
        // Update deployment status
        yield deployment_1.Deployment.update(deploymentId, {
            containerStatus: "stopped",
        });
        // Update project status
        yield project_1.Project.updateStatus(deployment.projectId, "INACTIVE");
        res.status(200).json({
            success: true,
            message: "Deployment stopped successfully",
            data: null,
        });
    }
    catch (error) {
        console.error("Stop deployment error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Start deployment (start container)
const startDeployment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deploymentId } = req.params;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        const deployment = yield deployment_1.Deployment.findById(deploymentId);
        if (!deployment) {
            return (0, helper_1.sendError)(res, 404, "Deployment not found");
        }
        if (deployment.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this deployment");
        }
        if (!deployment.containerName) {
            return (0, helper_1.sendError)(res, 400, "No container associated with this deployment");
        }
        // Start container
        const started = yield containerManager.startContainer(deployment.containerName);
        if (!started) {
            return (0, helper_1.sendError)(res, 500, "Failed to start container");
        }
        // Update deployment status
        yield deployment_1.Deployment.update(deploymentId, {
            containerStatus: "running",
        });
        // Update project status
        yield project_1.Project.updateStatus(deployment.projectId, "ACTIVE");
        res.status(200).json({
            success: true,
            message: "Deployment started successfully",
            data: null,
        });
    }
    catch (error) {
        console.error("Start deployment error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Delete deployment
const deleteDeployment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { deploymentId } = req.params;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        const deployment = yield deployment_1.Deployment.findById(deploymentId);
        if (!deployment) {
            return (0, helper_1.sendError)(res, 404, "Deployment not found");
        }
        if (deployment.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this deployment");
        }
        // Remove container if exists
        if (deployment.containerName) {
            yield containerManager.removeContainer(deployment.containerName);
        }
        // Remove Docker image if exists
        if (deployment.dockerImageId) {
            yield dockerBuilder.removeImage(deployment.dockerImageId);
        }
        // Remove nginx route if exists
        if ((_a = deployment.project) === null || _a === void 0 ? void 0 : _a.name) {
            const sanitizedProjectName = deployment.project.name
                .toLowerCase()
                .replace(/[^a-z0-9-_.]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
            yield nginxConfigManager.removeAppRoute(sanitizedProjectName);
            console.log(`🗑️ Removed nginx route for: ${sanitizedProjectName}`);
        }
        // Delete deployment record
        yield deployment_1.Deployment.delete(deploymentId);
        res.status(200).json({
            success: true,
            message: "Deployment deleted successfully",
            data: null,
        });
    }
    catch (error) {
        console.error("Delete deployment error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Helper functions
function extractZipFile(zipPath, extractPath) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- EXTRACT ZIP FUNCTION ---");
        console.log("ZIP path:", zipPath);
        console.log("Extract path:", extractPath);
        const AdmZip = require("adm-zip");
        try {
            console.log("Creating AdmZip instance...");
            const zip = new AdmZip(zipPath);
            console.log("Getting ZIP entries...");
            const entries = zip.getEntries();
            console.log("ZIP entries count:", entries.length);
            if (entries.length > 0) {
                console.log("ZIP entries:");
                entries.forEach((entry, index) => {
                    console.log(`  ${index + 1}. ${entry.entryName} (${entry.header.size} bytes, dir: ${entry.isDirectory})`);
                });
            }
            console.log("Extracting all files...");
            zip.extractAllTo(extractPath, true);
            console.log("ZIP extraction completed successfully");
            // Verify extraction
            console.log("Verifying extraction...");
            const extractedExists = yield fs_extra_1.default.pathExists(extractPath);
            console.log("Extract path exists:", extractedExists);
            if (extractedExists) {
                const extractedItems = yield fs_extra_1.default.readdir(extractPath);
                console.log("Extracted items:", extractedItems);
            }
        }
        catch (error) {
            console.error("ZIP extraction error:", error);
            throw new Error(`Failed to extract ZIP file: ${error.message}`);
        }
    });
}
function getPortForFramework(framework) {
    switch (framework.toLowerCase()) {
        case "react":
        case "vue":
        case "angular":
        case "static":
            return 80; // Nginx serves on port 80
        case "next":
        case "nuxt":
        case "node":
        case "express":
        default:
            return 3000;
    }
}
exports.default = {
    deployProject: [upload.single("projectFile"), deployProject],
    getDeployment,
    getProjectDeployments,
    getDeploymentLogs,
    stopDeployment,
    startDeployment,
    deleteDeployment,
};
