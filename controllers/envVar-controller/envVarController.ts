import { Response, Request } from "express";
import { EnvVar } from "../../models/envVar/envVar";
import { Project } from "../../models/project/project";
import { sendError } from "../../utils/helper";
// import { CustomRequest } from "../../utils/types";

// Get environment variables for a project
const getProjectEnvVars = async (
  req: Request,
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

    const envVars = await EnvVar.findByProjectId(projectId);

    res.status(200).json({
      success: true,
      message: "Environment variables retrieved successfully",
      data: envVars,
    });
  } catch (error) {
    console.error("Get project env vars error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Create or update environment variable
const upsertEnvVar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { key, value } = req.body;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    if (!key || !value) {
      return sendError(res, 400, "Key and value are required");
    }

    // Check if project exists and user owns it
    const project = await Project.findById(projectId);
    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    if (project.userId !== userId) {
      return sendError(res, 403, "Access denied: You don't own this project");
    }

    // Validate key format (should be uppercase, underscore separated)
    const keyRegex = /^[A-Z][A-Z0-9_]*$/;
    if (!keyRegex.test(key)) {
      return sendError(
        res,
        400,
        "Key must be uppercase with underscores (e.g., DATABASE_URL)"
      );
    }

    const envVar = await EnvVar.upsert(projectId, key, value);

    res.status(200).json({
      success: true,
      message: "Environment variable saved successfully",
      data: envVar,
    });
  } catch (error) {
    console.error("Upsert env var error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Delete environment variable
const deleteEnvVar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, key } = req.params;
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

    // Check if env var exists
    const envVar = await EnvVar.findByProjectAndKey(projectId, key);
    if (!envVar) {
      return sendError(res, 404, "Environment variable not found");
    }

    await EnvVar.deleteByProjectAndKey(projectId, key);

    res.status(200).json({
      success: true,
      message: "Environment variable deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error("Delete env var error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Bulk update environment variables
const bulkUpdateEnvVars = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { envVars } = req.body;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    if (!envVars || !Array.isArray(envVars)) {
      return sendError(res, 400, "Environment variables array is required");
    }

    // Check if project exists and user owns it
    const project = await Project.findById(projectId);
    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    if (project.userId !== userId) {
      return sendError(res, 403, "Access denied: You don't own this project");
    }

    // Validate all keys
    const keyRegex = /^[A-Z][A-Z0-9_]*$/;
    for (const envVar of envVars) {
      if (!envVar.key || !envVar.value) {
        return sendError(
          res,
          400,
          "All environment variables must have key and value"
        );
      }
      if (!keyRegex.test(envVar.key)) {
        return sendError(
          res,
          400,
          `Invalid key format: ${envVar.key}. Must be uppercase with underscores`
        );
      }
    }

    // Delete existing env vars for this project
    await EnvVar.deleteAllByProject(projectId);

    // Create new env vars
    await EnvVar.createMany(projectId, envVars);

    // Fetch updated env vars
    const updatedEnvVars = await EnvVar.findByProjectId(projectId);

    res.status(200).json({
      success: true,
      message: "Environment variables updated successfully",
      data: updatedEnvVars,
    });
  } catch (error) {
    console.error("Bulk update env vars error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

export default {
  getProjectEnvVars,
  upsertEnvVar,
  deleteEnvVar,
  bulkUpdateEnvVars,
};
