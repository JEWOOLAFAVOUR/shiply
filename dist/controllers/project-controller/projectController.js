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
const project_1 = require("../../models/project/project");
const envVar_1 = require("../../models/envVar/envVar");
const helper_1 = require("../../utils/helper");
// Create a new project
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, repoUrl, framework, envVars } = req.body;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        if (!name || !framework) {
            return (0, helper_1.sendError)(res, 400, "Project name and framework are required");
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
            return (0, helper_1.sendError)(res, 400, `Invalid framework. Supported: ${validFrameworks.join(", ")}`);
        }
        // Create the project
        const newProject = yield project_1.Project.create({
            name,
            description: description || null,
            repoUrl: repoUrl || null,
            framework: framework.toLowerCase(),
            status: "INACTIVE",
            userId,
        });
        // Add environment variables if provided
        if (envVars && Array.isArray(envVars) && envVars.length > 0) {
            yield envVar_1.EnvVar.createMany(newProject.id, envVars);
        }
        // Fetch the complete project with env vars
        const completeProject = yield project_1.Project.findById(newProject.id);
        res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: completeProject,
        });
    }
    catch (error) {
        console.error("Create project error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Get all projects for the authenticated user
const getUserProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        const projects = yield project_1.Project.findByUserId(userId);
        res.status(200).json({
            success: true,
            message: "Projects retrieved successfully",
            data: projects,
        });
    }
    catch (error) {
        console.error("Get user projects error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Get a specific project by ID
const getProjectById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        const project = yield project_1.Project.findById(projectId);
        if (!project) {
            return (0, helper_1.sendError)(res, 404, "Project not found");
        }
        // Check if user owns this project
        if (project.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this project");
        }
        res.status(200).json({
            success: true,
            message: "Project retrieved successfully",
            data: project,
        });
    }
    catch (error) {
        console.error("Get project by ID error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Update a project
const updateProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const { name, description, repoUrl, framework } = req.body;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        // Check if project exists and user owns it
        const existingProject = yield project_1.Project.findById(projectId);
        if (!existingProject) {
            return (0, helper_1.sendError)(res, 404, "Project not found");
        }
        if (existingProject.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this project");
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
                return (0, helper_1.sendError)(res, 400, `Invalid framework. Supported: ${validFrameworks.join(", ")}`);
            }
        }
        // Update the project
        const updateData = {};
        if (name)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (repoUrl !== undefined)
            updateData.repoUrl = repoUrl;
        if (framework)
            updateData.framework = framework.toLowerCase();
        const updatedProject = yield project_1.Project.update(projectId, updateData);
        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: updatedProject,
        });
    }
    catch (error) {
        console.error("Update project error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Delete a project
const deleteProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        // Check if project exists and user owns it
        const existingProject = yield project_1.Project.findById(projectId);
        if (!existingProject) {
            return (0, helper_1.sendError)(res, 404, "Project not found");
        }
        if (existingProject.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this project");
        }
        // Don't allow deletion if project is currently building or active
        if (existingProject.status === "BUILDING") {
            return (0, helper_1.sendError)(res, 400, "Cannot delete project while building");
        }
        yield project_1.Project.delete(projectId);
        res.status(200).json({
            success: true,
            message: "Project deleted successfully",
            data: null,
        });
    }
    catch (error) {
        console.error("Delete project error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Update project status (for deployment processes)
const updateProjectStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const { status } = req.body;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        if (!status) {
            return (0, helper_1.sendError)(res, 400, "Status is required");
        }
        const validStatuses = ["ACTIVE", "INACTIVE", "BUILDING", "ERROR"];
        if (!validStatuses.includes(status)) {
            return (0, helper_1.sendError)(res, 400, `Invalid status. Valid statuses: ${validStatuses.join(", ")}`);
        }
        // Check if project exists and user owns it
        const existingProject = yield project_1.Project.findById(projectId);
        if (!existingProject) {
            return (0, helper_1.sendError)(res, 404, "Project not found");
        }
        if (existingProject.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this project");
        }
        const updatedProject = yield project_1.Project.updateStatus(projectId, status);
        res.status(200).json({
            success: true,
            message: "Project status updated successfully",
            data: updatedProject,
        });
    }
    catch (error) {
        console.error("Update project status error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Get all projects (admin only - for future use)
const getAllProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // In a real app, you'd check for admin permissions here
        const projects = yield project_1.Project.findAll();
        res.status(200).json({
            success: true,
            message: "All projects retrieved successfully",
            data: projects,
        });
    }
    catch (error) {
        console.error("Get all projects error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
exports.default = {
    createProject,
    getUserProjects,
    getProjectById,
    updateProject,
    deleteProject,
    updateProjectStatus,
    getAllProjects,
};
