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
const envVar_1 = require("../../models/envVar/envVar");
const project_1 = require("../../models/project/project");
const helper_1 = require("../../utils/helper");
// Get environment variables for a project
const getProjectEnvVars = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const envVars = yield envVar_1.EnvVar.findByProjectId(projectId);
        res.status(200).json({
            success: true,
            message: "Environment variables retrieved successfully",
            data: envVars,
        });
    }
    catch (error) {
        console.error("Get project env vars error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Create or update environment variable
const upsertEnvVar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const { key, value } = req.body;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        if (!key || !value) {
            return (0, helper_1.sendError)(res, 400, "Key and value are required");
        }
        // Check if project exists and user owns it
        const project = yield project_1.Project.findById(projectId);
        if (!project) {
            return (0, helper_1.sendError)(res, 404, "Project not found");
        }
        if (project.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this project");
        }
        // Validate key format (should be uppercase, underscore separated)
        const keyRegex = /^[A-Z][A-Z0-9_]*$/;
        if (!keyRegex.test(key)) {
            return (0, helper_1.sendError)(res, 400, "Key must be uppercase with underscores (e.g., DATABASE_URL)");
        }
        const envVar = yield envVar_1.EnvVar.upsert(projectId, key, value);
        res.status(200).json({
            success: true,
            message: "Environment variable saved successfully",
            data: envVar,
        });
    }
    catch (error) {
        console.error("Upsert env var error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Delete environment variable
const deleteEnvVar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId, key } = req.params;
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
        // Check if env var exists
        const envVar = yield envVar_1.EnvVar.findByProjectAndKey(projectId, key);
        if (!envVar) {
            return (0, helper_1.sendError)(res, 404, "Environment variable not found");
        }
        yield envVar_1.EnvVar.deleteByProjectAndKey(projectId, key);
        res.status(200).json({
            success: true,
            message: "Environment variable deleted successfully",
            data: null,
        });
    }
    catch (error) {
        console.error("Delete env var error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
// Bulk update environment variables
const bulkUpdateEnvVars = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const { envVars } = req.body;
        const userId = req.userId;
        if (!userId) {
            return (0, helper_1.sendError)(res, 401, "Authentication required");
        }
        if (!envVars || !Array.isArray(envVars)) {
            return (0, helper_1.sendError)(res, 400, "Environment variables array is required");
        }
        // Check if project exists and user owns it
        const project = yield project_1.Project.findById(projectId);
        if (!project) {
            return (0, helper_1.sendError)(res, 404, "Project not found");
        }
        if (project.userId !== userId) {
            return (0, helper_1.sendError)(res, 403, "Access denied: You don't own this project");
        }
        // Validate all keys
        const keyRegex = /^[A-Z][A-Z0-9_]*$/;
        for (const envVar of envVars) {
            if (!envVar.key || !envVar.value) {
                return (0, helper_1.sendError)(res, 400, "All environment variables must have key and value");
            }
            if (!keyRegex.test(envVar.key)) {
                return (0, helper_1.sendError)(res, 400, `Invalid key format: ${envVar.key}. Must be uppercase with underscores`);
            }
        }
        // Delete existing env vars for this project
        yield envVar_1.EnvVar.deleteAllByProject(projectId);
        // Create new env vars
        yield envVar_1.EnvVar.createMany(projectId, envVars);
        // Fetch updated env vars
        const updatedEnvVars = yield envVar_1.EnvVar.findByProjectId(projectId);
        res.status(200).json({
            success: true,
            message: "Environment variables updated successfully",
            data: updatedEnvVars,
        });
    }
    catch (error) {
        console.error("Bulk update env vars error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
exports.default = {
    getProjectEnvVars,
    upsertEnvVar,
    deleteEnvVar,
    bulkUpdateEnvVars,
};
