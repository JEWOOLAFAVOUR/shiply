"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = __importDefault(require("../../controllers/project-controller/projectController"));
const envVarController_1 = __importDefault(require("../../controllers/envVar-controller/envVarController"));
const verifyToken_1 = require("../../middlewares/verifyToken");
const validator_1 = require("../../middlewares/validator");
const projectValidator_1 = require("../../middlewares/projectValidator");
const router = (0, express_1.Router)();
/**
 * @route POST /api/v1/projects
 * @desc Create a new project
 * @access Private
 */
router.post("/", verifyToken_1.verifyToken, projectValidator_1.validateCreateProject, validator_1.validate, projectController_1.default.createProject);
/**
 * @route GET /api/v1/projects
 * @desc Get all projects for the authenticated user
 * @access Private
 */
router.get("/", verifyToken_1.verifyToken, projectController_1.default.getUserProjects);
/**
 * @route GET /api/v1/projects/all
 * @desc Get all projects (admin only)
 * @access Private (Admin)
 */
router.get("/all", verifyToken_1.verifyToken, projectController_1.default.getAllProjects);
/**
 * @route GET /api/v1/projects/:projectId
 * @desc Get a specific project by ID
 * @access Private
 */
router.get("/:projectId", verifyToken_1.verifyToken, projectValidator_1.validateProjectId, validator_1.validate, projectController_1.default.getProjectById);
/**
 * @route PUT /api/v1/projects/:projectId
 * @desc Update a project
 * @access Private
 */
router.put("/:projectId", verifyToken_1.verifyToken, projectValidator_1.validateUpdateProject, validator_1.validate, projectController_1.default.updateProject);
/**
 * @route PATCH /api/v1/projects/:projectId/status
 * @desc Update project status
 * @access Private
 */
router.patch("/:projectId/status", verifyToken_1.verifyToken, projectValidator_1.validateProjectStatus, validator_1.validate, projectController_1.default.updateProjectStatus);
/**
 * @route DELETE /api/v1/projects/:projectId
 * @desc Delete a project
 * @access Private
 */
router.delete("/:projectId", verifyToken_1.verifyToken, projectValidator_1.validateProjectId, validator_1.validate, projectController_1.default.deleteProject);
// Environment Variables Routes
/**
 * @route GET /api/v1/projects/:projectId/env
 * @desc Get environment variables for a project
 * @access Private
 */
router.get("/:projectId/env", verifyToken_1.verifyToken, projectValidator_1.validateProjectId, validator_1.validate, envVarController_1.default.getProjectEnvVars);
/**
 * @route PUT /api/v1/projects/:projectId/env
 * @desc Create or update environment variable
 * @access Private
 */
router.put("/:projectId/env", verifyToken_1.verifyToken, projectValidator_1.validateEnvVar, validator_1.validate, envVarController_1.default.upsertEnvVar);
/**
 * @route DELETE /api/v1/projects/:projectId/env/:key
 * @desc Delete environment variable
 * @access Private
 */
router.delete("/:projectId/env/:key", verifyToken_1.verifyToken, projectValidator_1.validateEnvVarDelete, validator_1.validate, envVarController_1.default.deleteEnvVar);
/**
 * @route POST /api/v1/projects/:projectId/env/bulk
 * @desc Bulk update environment variables
 * @access Private
 */
router.post("/:projectId/env/bulk", verifyToken_1.verifyToken, projectValidator_1.validateBulkEnvVars, validator_1.validate, envVarController_1.default.bulkUpdateEnvVars);
exports.default = router;
