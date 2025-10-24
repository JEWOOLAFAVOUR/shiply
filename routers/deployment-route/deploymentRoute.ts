import { Router } from "express";
import deploymentController from "../../controllers/deployment-controller/deploymentController";
import { verifyToken } from "../../middlewares/verifyToken";
import { body, param, query } from "express-validator";
import { validate } from "../../middlewares/validator";

const router = Router();

/**
 * @route POST /api/v1/projects/:projectId/deploy
 * @desc Deploy a project
 * @access Private
 */
router.post(
  "/:projectId/deploy",
  verifyToken,
  [
    param("projectId")
      .isLength({ min: 1 })
      .withMessage("Project ID is required"),
    body("version")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Version must be between 1 and 50 characters"),
    body("memoryLimit")
      .optional()
      .isInt({ min: 128, max: 2048 })
      .withMessage("Memory limit must be between 128MB and 2048MB"),
    body("cpuLimit")
      .optional()
      .isInt({ min: 512, max: 4096 })
      .withMessage("CPU limit must be between 512 and 4096 shares"),
  ],
  validate,
  deploymentController.deployProject
);

/**
 * @route GET /api/v1/deployments/:deploymentId
 * @desc Get deployment details
 * @access Private
 */
router.get(
  "/:deploymentId/deploy",
  verifyToken,
  [
    param("deploymentId")
      .isLength({ min: 1 })
      .withMessage("Deployment ID is required"),
  ],
  validate,
  deploymentController.getDeployment
);

/**
 * @route GET /api/v1/projects/:projectId/deployments
 * @desc Get all deployments for a project
 * @access Private
 */
router.get(
  "/:projectId/deployments",
  verifyToken,
  [
    param("projectId")
      .isLength({ min: 1 })
      .withMessage("Project ID is required"),
  ],
  validate,
  deploymentController.getProjectDeployments
);

/**
 * @route GET /api/v1/deployments/:deploymentId/logs
 * @desc Get deployment logs
 * @access Private
 */
router.get(
  "/:deploymentId/logs",
  verifyToken,
  [
    param("deploymentId")
      .isLength({ min: 1 })
      .withMessage("Deployment ID is required"),
    query("tail")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Tail must be between 1 and 1000 lines"),
  ],
  validate,
  deploymentController.getDeploymentLogs
);

/**
 * @route POST /api/v1/deployments/:deploymentId/stop
 * @desc Stop a deployment (stop container)
 * @access Private
 */
router.post(
  "/:deploymentId/stop",
  verifyToken,
  [
    param("deploymentId")
      .isLength({ min: 1 })
      .withMessage("Deployment ID is required"),
  ],
  validate,
  deploymentController.stopDeployment
);

/**
 * @route POST /api/v1/deployments/:deploymentId/start
 * @desc Start a deployment (start container)
 * @access Private
 */
router.post(
  "/:deploymentId/start",
  verifyToken,
  [
    param("deploymentId")
      .isLength({ min: 1 })
      .withMessage("Deployment ID is required"),
  ],
  validate,
  deploymentController.startDeployment
);

/**
 * @route DELETE /api/v1/deployments/:deploymentId
 * @desc Delete a deployment
 * @access Private
 */
router.delete(
  "/:deploymentId",
  verifyToken,
  [
    param("deploymentId")
      .isLength({ min: 1 })
      .withMessage("Deployment ID is required"),
  ],
  validate,
  deploymentController.deleteDeployment
);

export default router;
