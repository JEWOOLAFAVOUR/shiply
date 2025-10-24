import { Response } from "express";
import { Deployment } from "../../models/deployment/deployment";
import { Project } from "../../models/project/project";
import { sendError } from "../../utils/helper";
import { CustomRequest } from "../../utils/types";
import { DockerBuildService } from "../../services/dockerBuildService";
import { ContainerManager } from "../../services/containerManager";
import { NginxManager } from "../../services/nginxManager";
import { NginxConfigManager } from "../../services/nginxConfigManager";
import fs from "fs-extra";
import path from "path";
import multer from "multer";
import archiver from "archiver";

// Multer configuration for file uploads
const upload = multer({
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

    if (
      allowedMimes.includes(file.mimetype) ||
      file.originalname.endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed"));
    }
  },
});

// Initialize services
const dockerBuilder = new DockerBuildService();
const containerManager = new ContainerManager();
const nginxConfigManager = new NginxConfigManager();

// Deploy a project
const deployProject = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { version, memoryLimit, cpuLimit } = req.body;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    // Check if project exists and user owns it
    const project = await Project.findById(projectId);
    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    if (project.userId !== userId) {
      return sendError(res, 403, "Access denied: You don't own this project");
    }

    // Check if file was uploaded
    if (!req.file) {
      return sendError(res, 400, "Project file (ZIP) is required");
    }

    // Create deployment record
    const deployment = await Deployment.create({
      version: version || `v${Date.now()}`,
      status: "PENDING",
      projectId,
      userId,
      memoryLimit: memoryLimit ? parseInt(memoryLimit) : 512,
      cpuLimit: cpuLimit ? parseInt(cpuLimit) : 1024,
    });

    // Set project status to building
    await Project.updateStatus(projectId, "BUILDING");

    // Start deployment process asynchronously
    processDeployment(deployment.id, req.file.path, project, deployment).catch(
      (error) => {
        console.error("Deployment process error:", error);
      }
    );

    res.status(201).json({
      success: true,
      message: "Deployment started successfully",
      data: deployment,
    });
  } catch (error) {
    console.error("Deploy project error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Process deployment asynchronously
async function processDeployment(
  deploymentId: string,
  uploadPath: string,
  project: any,
  deployment: any
) {
  const workDir = path.join(process.cwd(), "temp", deploymentId);

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
    await Deployment.updateStatus(deploymentId, "BUILDING");
    console.log("Status updated to BUILDING");

    // Check if uploaded file exists
    console.log("\n--- CHECKING UPLOADED FILE ---");
    const uploadExists = await fs.pathExists(uploadPath);
    console.log("Upload file exists:", uploadExists);
    if (uploadExists) {
      const uploadStats = await fs.stat(uploadPath);
      console.log("Upload file size:", uploadStats.size, "bytes");
    }

    // Extract uploaded ZIP file
    console.log("\n--- EXTRACTING ZIP FILE ---");
    console.log("Extracting from:", uploadPath);
    console.log("Extracting to:", workDir);

    await extractZipFile(uploadPath, workDir);
    console.log("ZIP extraction completed");

    // Check what was extracted and find the correct project path
    console.log("\n--- CHECKING EXTRACTED CONTENTS ---");
    const workDirExists = await fs.pathExists(workDir);
    console.log("Work directory exists:", workDirExists);

    let actualProjectPath = workDir;
    let packageJsonFound = false;

    if (workDirExists) {
      const extractedFiles = await fs.readdir(workDir);
      console.log("Extracted files/folders:", extractedFiles);

      // Check for package.json in root
      const packageJsonPath = path.join(workDir, "package.json");
      const packageJsonExists = await fs.pathExists(packageJsonPath);
      console.log("package.json exists in root:", packageJsonExists);

      if (packageJsonExists) {
        actualProjectPath = workDir;
        packageJsonFound = true;
        console.log("✅ Using root directory as project path");
      } else if (extractedFiles.length > 0) {
        // Check if there's a subdirectory containing the project
        console.log("🔍 Searching for package.json in subdirectories...");
        for (const item of extractedFiles) {
          const itemPath = path.join(workDir, item);
          const itemStat = await fs.stat(itemPath);
          if (itemStat.isDirectory()) {
            console.log(`Checking subdirectory: ${item}`);
            const subDirFiles = await fs.readdir(itemPath);
            console.log(`Files in ${item}:`, subDirFiles);

            const subPackageJson = path.join(itemPath, "package.json");
            const subPackageJsonExists = await fs.pathExists(subPackageJson);
            console.log(`package.json in ${item}:`, subPackageJsonExists);

            if (subPackageJsonExists) {
              actualProjectPath = itemPath;
              packageJsonFound = true;
              console.log(`✅ Found package.json in subdirectory: ${item}`);
              console.log(
                `✅ Using ${item} as project path: ${actualProjectPath}`
              );
              break;
            }
          }
        }
      }

      if (!packageJsonFound) {
        throw new Error(
          "No package.json found in the uploaded project. Please ensure your ZIP file contains a valid Node.js project with package.json."
        );
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

    const buildResult = await dockerBuilder.buildProject({
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
      buildLogsLength: buildResult.buildLogs?.length || 0,
    });

    // Update deployment with build logs
    await Deployment.update(deploymentId, {
      buildLogs: buildResult.buildLogs.join("\n"),
      dockerImageId: buildResult.imageId,
      dockerImageName: buildResult.imageName,
    });

    if (!buildResult.success) {
      await Deployment.updateStatus(deploymentId, "FAILED");
      await Project.updateStatus(project.id, "ERROR");
      return;
    }

    // Deploy container
    const containerName = `${sanitizedProjectName}-${project.userId}-${deployment.version}`;
    console.log("Container name:", containerName);

    const containerConfig = {
      imageId: buildResult.imageId!,
      imageName: buildResult.imageName,
      containerName: containerName,
      port: getPortForFramework(project.framework),
      memoryLimit: deployment.memoryLimit || 512,
      cpuLimit: deployment.cpuLimit || 1024,
    };

    const containerInfo = await containerManager.deployContainer(
      containerConfig
    );

    // Get assigned host port
    const hostPort =
      containerInfo.ports.find((p) => p.Type === "tcp")?.PublicPort || 0;

    // Configure Nginx reverse proxy for custom domain
    const subdomain = sanitizedProjectName; // Already sanitized above
    const customUrl = `http://${subdomain}.shiply.local`;

    console.log(
      `🌐 Setting up reverse proxy: ${customUrl} → localhost:${hostPort}`
    );

    // Add nginx route for the deployed app
    await nginxConfigManager.addAppRoute({
      appName: sanitizedProjectName,
      subdomain: subdomain,
      port: hostPort,
      containerName: containerName,
    });

    // Notify user about host entry
    await nginxConfigManager.addHostEntry(subdomain);

    console.log(`✅ App deployed and accessible at: ${customUrl}`);

    // Update deployment with container info
    await Deployment.update(deploymentId, {
      containerName: containerName,
      containerPort: containerConfig.port,
      hostPort: hostPort,
      containerStatus: containerInfo.state,
      deployUrl: customUrl, // Use custom domain instead of localhost
      status: "SUCCESS",
    });

    // Update project status
    await Project.updateStatus(project.id, "ACTIVE");
  } catch (error: any) {
    console.error("Deployment process failed:", error);

    // Update deployment as failed
    await Deployment.update(deploymentId, {
      buildLogs: `Deployment failed: ${error.message}`,
      status: "FAILED",
    });

    await Project.updateStatus(project.id, "ERROR");
  } finally {
    // Cleanup
    try {
      await fs.remove(uploadPath);
      await fs.remove(workDir);
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }
  }
}

// Get deployment details
const getDeployment = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { deploymentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      return sendError(res, 404, "Deployment not found");
    }

    if (deployment.userId !== userId) {
      return sendError(
        res,
        403,
        "Access denied: You don't own this deployment"
      );
    }

    res.status(200).json({
      success: true,
      message: "Deployment retrieved successfully",
      data: deployment,
    });
  } catch (error) {
    console.error("Get deployment error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Get deployments for a project
const getProjectDeployments = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    // Check if project exists and user owns it
    const project = await Project.findById(projectId);
    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    if (project.userId !== userId) {
      return sendError(res, 403, "Access denied: You don't own this project");
    }

    const deployments = await Deployment.findByProjectId(projectId);

    res.status(200).json({
      success: true,
      message: "Deployments retrieved successfully",
      data: deployments,
    });
  } catch (error) {
    console.error("Get project deployments error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Get deployment logs
const getDeploymentLogs = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { deploymentId } = req.params;
    const { tail } = req.query;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      return sendError(res, 404, "Deployment not found");
    }

    if (deployment.userId !== userId) {
      return sendError(
        res,
        403,
        "Access denied: You don't own this deployment"
      );
    }

    let logs: string[] = [];

    // Get build logs
    if (deployment.buildLogs) {
      logs.push("=== BUILD LOGS ===");
      logs.push(...deployment.buildLogs.split("\n"));
    }

    // Get container logs if container exists
    if (deployment.containerName) {
      logs.push("=== CONTAINER LOGS ===");
      const containerLogs = await containerManager.getContainerLogs(
        deployment.containerName,
        tail ? parseInt(tail as string) : 100
      );
      logs.push(...containerLogs);
    }

    res.status(200).json({
      success: true,
      message: "Logs retrieved successfully",
      data: { logs },
    });
  } catch (error) {
    console.error("Get deployment logs error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Stop deployment (stop container)
const stopDeployment = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { deploymentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      return sendError(res, 404, "Deployment not found");
    }

    if (deployment.userId !== userId) {
      return sendError(
        res,
        403,
        "Access denied: You don't own this deployment"
      );
    }

    if (!deployment.containerName) {
      return sendError(
        res,
        400,
        "No container associated with this deployment"
      );
    }

    // Stop container
    const stopped = await containerManager.stopContainer(
      deployment.containerName
    );
    if (!stopped) {
      return sendError(res, 500, "Failed to stop container");
    }

    // Update deployment status
    await Deployment.update(deploymentId, {
      containerStatus: "stopped",
    });

    // Update project status
    await Project.updateStatus(deployment.projectId, "INACTIVE");

    res.status(200).json({
      success: true,
      message: "Deployment stopped successfully",
      data: null,
    });
  } catch (error) {
    console.error("Stop deployment error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Start deployment (start container)
const startDeployment = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { deploymentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      return sendError(res, 404, "Deployment not found");
    }

    if (deployment.userId !== userId) {
      return sendError(
        res,
        403,
        "Access denied: You don't own this deployment"
      );
    }

    if (!deployment.containerName) {
      return sendError(
        res,
        400,
        "No container associated with this deployment"
      );
    }

    // Start container
    const started = await containerManager.startContainer(
      deployment.containerName
    );
    if (!started) {
      return sendError(res, 500, "Failed to start container");
    }

    // Update deployment status
    await Deployment.update(deploymentId, {
      containerStatus: "running",
    });

    // Update project status
    await Project.updateStatus(deployment.projectId, "ACTIVE");

    res.status(200).json({
      success: true,
      message: "Deployment started successfully",
      data: null,
    });
  } catch (error) {
    console.error("Start deployment error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Delete deployment
const deleteDeployment = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { deploymentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      return sendError(res, 404, "Deployment not found");
    }

    if (deployment.userId !== userId) {
      return sendError(
        res,
        403,
        "Access denied: You don't own this deployment"
      );
    }

    // Remove container if exists
    if (deployment.containerName) {
      await containerManager.removeContainer(deployment.containerName);
    }

    // Remove Docker image if exists
    if (deployment.dockerImageId) {
      await dockerBuilder.removeImage(deployment.dockerImageId);
    }

    // Remove nginx route if exists
    if (deployment.project?.name) {
      const sanitizedProjectName = deployment.project.name
        .toLowerCase()
        .replace(/[^a-z0-9-_.]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      await nginxConfigManager.removeAppRoute(sanitizedProjectName);
      console.log(`🗑️ Removed nginx route for: ${sanitizedProjectName}`);
    }

    // Delete deployment record
    await Deployment.delete(deploymentId);

    res.status(200).json({
      success: true,
      message: "Deployment deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error("Delete deployment error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Helper functions
async function extractZipFile(
  zipPath: string,
  extractPath: string
): Promise<void> {
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
      entries.forEach((entry: any, index: number) => {
        console.log(
          `  ${index + 1}. ${entry.entryName} (${
            entry.header.size
          } bytes, dir: ${entry.isDirectory})`
        );
      });
    }

    console.log("Extracting all files...");
    zip.extractAllTo(extractPath, true);
    console.log("ZIP extraction completed successfully");

    // Verify extraction
    console.log("Verifying extraction...");
    const extractedExists = await fs.pathExists(extractPath);
    console.log("Extract path exists:", extractedExists);

    if (extractedExists) {
      const extractedItems = await fs.readdir(extractPath);
      console.log("Extracted items:", extractedItems);
    }
  } catch (error: any) {
    console.error("ZIP extraction error:", error);
    throw new Error(`Failed to extract ZIP file: ${error.message}`);
  }
}

function getPortForFramework(framework: string): number {
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

export default {
  deployProject: [upload.single("projectFile"), deployProject],
  getDeployment,
  getProjectDeployments,
  getDeploymentLogs,
  stopDeployment,
  startDeployment,
  deleteDeployment,
};
