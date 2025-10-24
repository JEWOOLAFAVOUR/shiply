"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deploymentController_1 = __importDefault(require("../../controllers/deployment-controller/deploymentController"));
const verifyToken_1 = require("../../middlewares/verifyToken");
const express_validator_1 = require("express-validator");
const validator_1 = require("../../middlewares/validator");
const router = (0, express_1.Router)();
/**
 * @route POST /api/v1/projects/:projectId/deploy
 * @desc Deploy a project
 * @access Private
 */
router.post("/:projectId/deploy", verifyToken_1.verifyToken, [
    (0, express_validator_1.param)("projectId")
        .isLength({ min: 1 })
        .withMessage("Project ID is required"),
    (0, express_validator_1.body)("version")
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Version must be between 1 and 50 characters"),
    (0, express_validator_1.body)("memoryLimit")
        .optional()
        .isInt({ min: 128, max: 2048 })
        .withMessage("Memory limit must be between 128MB and 2048MB"),
    (0, express_validator_1.body)("cpuLimit")
        .optional()
        .isInt({ min: 512, max: 4096 })
        .withMessage("CPU limit must be between 512 and 4096 shares"),
], validator_1.validate, deploymentController_1.default.deployProject);
/**
 * @route GET /api/v1/deployments/:deploymentId
 * @desc Get deployment details
 * @access Private
 */
router.get("/:deploymentId/deploy", verifyToken_1.verifyToken, [
    (0, express_validator_1.param)("deploymentId")
        .isLength({ min: 1 })
        .withMessage("Deployment ID is required"),
], validator_1.validate, deploymentController_1.default.getDeployment);
/**
 * @route GET /api/v1/projects/:projectId/deployments
 * @desc Get all deployments for a project
 * @access Private
 */
router.get("/:projectId/deployments", verifyToken_1.verifyToken, [
    (0, express_validator_1.param)("projectId")
        .isLength({ min: 1 })
        .withMessage("Project ID is required"),
], validator_1.validate, deploymentController_1.default.getProjectDeployments);
/**
 * @route GET /api/v1/deployments/:deploymentId/logs
 * @desc Get deployment logs
 * @access Private
 */
router.get("/:deploymentId/logs", verifyToken_1.verifyToken, [
    (0, express_validator_1.param)("deploymentId")
        .isLength({ min: 1 })
        .withMessage("Deployment ID is required"),
    (0, express_validator_1.query)("tail")
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage("Tail must be between 1 and 1000 lines"),
], validator_1.validate, deploymentController_1.default.getDeploymentLogs);
/**
 * @route POST /api/v1/deployments/:deploymentId/stop
 * @desc Stop a deployment (stop container)
 * @access Private
 */
router.post("/:deploymentId/stop", verifyToken_1.verifyToken, [
    (0, express_validator_1.param)("deploymentId")
        .isLength({ min: 1 })
        .withMessage("Deployment ID is required"),
], validator_1.validate, deploymentController_1.default.stopDeployment);
/**
 * @route POST /api/v1/deployments/:deploymentId/start
 * @desc Start a deployment (start container)
 * @access Private
 */
router.post("/:deploymentId/start", verifyToken_1.verifyToken, [
    (0, express_validator_1.param)("deploymentId")
        .isLength({ min: 1 })
        .withMessage("Deployment ID is required"),
], validator_1.validate, deploymentController_1.default.startDeployment);
/**
 * @route DELETE /api/v1/deployments/:deploymentId
 * @desc Delete a deployment
 * @access Private
 */
router.delete("/:deploymentId", verifyToken_1.verifyToken, [
    (0, express_validator_1.param)("deploymentId")
        .isLength({ min: 1 })
        .withMessage("Deployment ID is required"),
], validator_1.validate, deploymentController_1.default.deleteDeployment);
exports.default = router;
