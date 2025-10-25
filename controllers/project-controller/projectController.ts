import { Request, Response } from "express";
import { Project } from "../../models/project/project";
import { EnvVar } from "../../models/envVar/envVar";
import { sendError } from "../../utils/helper";

// Create a new project
const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, description, repoUrl, framework, envVars } = req.body;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    if (!name || !framework) {
      return sendError(res, 400, "Project name and framework are required");
    }

    // Validate framework
    const validFrameworks = [
      "react",
      "vue",
      "angular",
      "node",
      "express",
      "next",
      "nuxt",
      "svelte",
      "static",
    ];
    if (!validFrameworks.includes(framework.toLowerCase())) {
      return sendError(
        res,
        400,
        `Invalid framework. Supported: ${validFrameworks.join(", ")}`
      );
    }

    // Create the project
    const newProject = await Project.create({
      name,
      description: description || null,
      repoUrl: repoUrl || null,
      framework: framework.toLowerCase(),
      status: "INACTIVE",
      userId,
    });

    // Add environment variables if provided
    if (envVars && Array.isArray(envVars) && envVars.length > 0) {
      await EnvVar.createMany(newProject.id, envVars);
    }

    // Fetch the complete project with env vars
    const completeProject = await Project.findById(newProject.id);

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: completeProject,
    });
  } catch (error) {
    console.error("Create project error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Get all projects for the authenticated user
const getUserProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    const projects = await Project.findByUserId(userId);

    res.status(200).json({
      success: true,
      message: "Projects retrieved successfully",
      data: projects,
    });
  } catch (error) {
    console.error("Get user projects error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Get a specific project by ID
const getProjectById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    // Check if user owns this project
    if (project.userId !== userId) {
      return sendError(res, 403, "Access denied: You don't own this project");
    }

    res.status(200).json({
      success: true,
      message: "Project retrieved successfully",
      data: project,
    });
  } catch (error) {
    console.error("Get project by ID error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Update a project
const updateProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { name, description, repoUrl, framework } = req.body;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    // Check if project exists and user owns it
    const existingProject = await Project.findById(projectId);
    if (!existingProject) {
      return sendError(res, 404, "Project not found");
    }

    if (existingProject.userId !== userId) {
      return sendError(res, 403, "Access denied: You don't own this project");
    }

    // Validate framework if provided
    if (framework) {
      const validFrameworks = [
        "react",
        "vue",
        "angular",
        "node",
        "express",
        "next",
        "nuxt",
        "svelte",
        "static",
      ];
      if (!validFrameworks.includes(framework.toLowerCase())) {
        return sendError(
          res,
          400,
          `Invalid framework. Supported: ${validFrameworks.join(", ")}`
        );
      }
    }

    // Update the project
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (repoUrl !== undefined) updateData.repoUrl = repoUrl;
    if (framework) updateData.framework = framework.toLowerCase();

    const updatedProject = await Project.update(projectId, updateData);

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Delete a project
const deleteProject = async (
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
    const existingProject = await Project.findById(projectId);
    if (!existingProject) {
      return sendError(res, 404, "Project not found");
    }

    if (existingProject.userId !== userId) {
      return sendError(res, 403, "Access denied: You don't own this project");
    }

    // Don't allow deletion if project is currently building or active
    if (existingProject.status === "BUILDING") {
      return sendError(res, 400, "Cannot delete project while building");
    }

    await Project.delete(projectId);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Update project status (for deployment processes)
const updateProjectStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    if (!status) {
      return sendError(res, 400, "Status is required");
    }

    const validStatuses = ["ACTIVE", "INACTIVE", "BUILDING", "ERROR"];
    if (!validStatuses.includes(status)) {
      return sendError(
        res,
        400,
        `Invalid status. Valid statuses: ${validStatuses.join(", ")}`
      );
    }

    // Check if project exists and user owns it
    const existingProject = await Project.findById(projectId);
    if (!existingProject) {
      return sendError(res, 404, "Project not found");
    }

    if (existingProject.userId !== userId) {
      return sendError(res, 403, "Access denied: You don't own this project");
    }

    const updatedProject = await Project.updateStatus(projectId, status);

    res.status(200).json({
      success: true,
      message: "Project status updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project status error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

// Get all projects (admin only - for future use)
const getAllProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // In a real app, you'd check for admin permissions here
    const projects = await Project.findAll();

    res.status(200).json({
      success: true,
      message: "All projects retrieved successfully",
      data: projects,
    });
  } catch (error) {
    console.error("Get all projects error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

export default {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  updateProjectStatus,
  getAllProjects,
};
