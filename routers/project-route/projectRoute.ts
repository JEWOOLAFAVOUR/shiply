import { Router } from "express";
import projectController from "../../controllers/project-controller/projectController";
import envVarController from "../../controllers/envVar-controller/envVarController";
import { verifyToken } from "../../middlewares/verifyToken";
import { validate } from "../../middlewares/validator";
import {
  validateCreateProject,
  validateUpdateProject,
  validateProjectId,
  validateProjectStatus,
  validateEnvVar,
  validateEnvVarDelete,
  validateBulkEnvVars,
} from "../../middlewares/projectValidator";

const router = Router();

/**
 * @route POST /api/v1/projects
 * @desc Create a new project
 * @access Private
 */
router.post(
  "/",
  verifyToken,
  validateCreateProject,
  validate,
  projectController.createProject
);

/**
 * @route GET /api/v1/projects
 * @desc Get all projects for the authenticated user
 * @access Private
 */
router.get("/", verifyToken, projectController.getUserProjects);

/**
 * @route GET /api/v1/projects/all
 * @desc Get all projects (admin only)
 * @access Private (Admin)
 */
router.get("/all", verifyToken, projectController.getAllProjects);

/**
 * @route GET /api/v1/projects/:projectId
 * @desc Get a specific project by ID
 * @access Private
 */
router.get(
  "/:projectId",
  verifyToken,
  validateProjectId,
  validate,
  projectController.getProjectById
);

/**
 * @route PUT /api/v1/projects/:projectId
 * @desc Update a project
 * @access Private
 */
router.put(
  "/:projectId",
  verifyToken,
  validateUpdateProject,
  validate,
  projectController.updateProject
);

/**
 * @route PATCH /api/v1/projects/:projectId/status
 * @desc Update project status
 * @access Private
 */
router.patch(
  "/:projectId/status",
  verifyToken,
  validateProjectStatus,
  validate,
  projectController.updateProjectStatus
);

/**
 * @route DELETE /api/v1/projects/:projectId
 * @desc Delete a project
 * @access Private
 */
router.delete(
  "/:projectId",
  verifyToken,
  validateProjectId,
  validate,
  projectController.deleteProject
);

// Environment Variables Routes

/**
 * @route GET /api/v1/projects/:projectId/env
 * @desc Get environment variables for a project
 * @access Private
 */
router.get(
  "/:projectId/env",
  verifyToken,
  validateProjectId,
  validate,
  envVarController.getProjectEnvVars
);

/**
 * @route PUT /api/v1/projects/:projectId/env
 * @desc Create or update environment variable
 * @access Private
 */
router.put(
  "/:projectId/env",
  verifyToken,
  validateEnvVar,
  validate,
  envVarController.upsertEnvVar
);

/**
 * @route DELETE /api/v1/projects/:projectId/env/:key
 * @desc Delete environment variable
 * @access Private
 */
router.delete(
  "/:projectId/env/:key",
  verifyToken,
  validateEnvVarDelete,
  validate,
  envVarController.deleteEnvVar
);

/**
 * @route POST /api/v1/projects/:projectId/env/bulk
 * @desc Bulk update environment variables
 * @access Private
 */
router.post(
  "/:projectId/env/bulk",
  verifyToken,
  validateBulkEnvVars,
  validate,
  envVarController.bulkUpdateEnvVars
);

export default router;
