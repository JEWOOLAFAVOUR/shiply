import { Router } from "express";
import projectController from "../../controllers/project-controller/projectController";
import { verifyToken } from "../../middlewares/verifyToken";
import { body, param } from "express-validator";
import { validator } from "../../middlewares/validator";

const router = Router();

/**
 * @route POST /api/v1/projects
 * @desc Create a new project
 * @access Private
 */
router.post(
  "/",
  verifyToken,
  [
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Project name must be between 1 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),
    body("repoUrl")
      .optional()
      .trim()
      .isURL()
      .withMessage("Repository URL must be a valid URL"),
    body("framework")
      .trim()
      .isIn(["react", "vue", "angular", "node", "express", "next", "nuxt", "svelte", "static"])
      .withMessage("Invalid framework"),
    body("envVars")
      .optional()
      .isArray()
      .withMessage("Environment variables must be an array"),
    body("envVars.*.key")
      .if(body("envVars").exists())
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Environment variable key must be between 1 and 100 characters"),
    body("envVars.*.value")
      .if(body("envVars").exists())
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Environment variable value must be between 1 and 1000 characters"),
  ],
  validator,
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
  [
    param("projectId")
      .isLength({ min: 1 })
      .withMessage("Project ID is required"),
  ],
  validator,
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
  [
    param("projectId")
      .isLength({ min: 1 })
      .withMessage("Project ID is required"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Project name must be between 1 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),
    body("repoUrl")
      .optional()
      .trim()
      .isURL()
      .withMessage("Repository URL must be a valid URL"),
    body("framework")
      .optional()
      .trim()
      .isIn(["react", "vue", "angular", "node", "express", "next", "nuxt", "svelte", "static"])
      .withMessage("Invalid framework"),
  ],
  validator,
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
  [
    param("projectId")
      .isLength({ min: 1 })
      .withMessage("Project ID is required"),
    body("status")
      .isIn(["ACTIVE", "INACTIVE", "BUILDING", "ERROR"])
      .withMessage("Invalid status"),
  ],
  validator,
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
  [
    param("projectId")
      .isLength({ min: 1 })
      .withMessage("Project ID is required"),
  ],
  validator,
  projectController.deleteProject
);

export default router;