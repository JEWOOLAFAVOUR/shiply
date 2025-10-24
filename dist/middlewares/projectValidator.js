"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBulkEnvVars = exports.validateEnvVarDelete = exports.validateEnvVar = exports.validateProjectStatus = exports.validateProjectId = exports.validateUpdateProject = exports.validateCreateProject = void 0;
const express_validator_1 = require("express-validator");
// Validate project creation
exports.validateCreateProject = [
    (0, express_validator_1.body)("name")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Project name must be between 1 and 100 characters"),
    (0, express_validator_1.body)("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description must be less than 500 characters"),
    (0, express_validator_1.body)("repoUrl")
        .optional()
        .trim()
        .isURL()
        .withMessage("Repository URL must be a valid URL"),
    (0, express_validator_1.body)("framework")
        .trim()
        .isIn([
        "react",
        "vue",
        "angular",
        "node",
        "express",
        "next",
        "nuxt",
        "svelte",
        "static",
    ])
        .withMessage("Invalid framework"),
    (0, express_validator_1.body)("envVars")
        .optional()
        .isArray()
        .withMessage("Environment variables must be an array"),
    (0, express_validator_1.body)("envVars.*.key")
        .if((0, express_validator_1.body)("envVars").exists())
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Environment variable key must be between 1 and 100 characters"),
    (0, express_validator_1.body)("envVars.*.value")
        .if((0, express_validator_1.body)("envVars").exists())
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage("Environment variable value must be between 1 and 1000 characters"),
];
// Validate project update
exports.validateUpdateProject = [
    (0, express_validator_1.param)("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
    (0, express_validator_1.body)("name")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Project name must be between 1 and 100 characters"),
    (0, express_validator_1.body)("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description must be less than 500 characters"),
    (0, express_validator_1.body)("repoUrl")
        .optional()
        .trim()
        .isURL()
        .withMessage("Repository URL must be a valid URL"),
    (0, express_validator_1.body)("framework")
        .optional()
        .trim()
        .isIn([
        "react",
        "vue",
        "angular",
        "node",
        "express",
        "next",
        "nuxt",
        "svelte",
        "static",
    ])
        .withMessage("Invalid framework"),
];
// Validate project ID parameter
exports.validateProjectId = [
    (0, express_validator_1.param)("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
];
// Validate project status update
exports.validateProjectStatus = [
    (0, express_validator_1.param)("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
    (0, express_validator_1.body)("status")
        .isIn(["ACTIVE", "INACTIVE", "BUILDING", "ERROR"])
        .withMessage("Invalid status"),
];
// Validate environment variable creation/update
exports.validateEnvVar = [
    (0, express_validator_1.param)("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
    (0, express_validator_1.body)("key")
        .trim()
        .matches(/^[A-Z][A-Z0-9_]*$/)
        .withMessage("Key must be uppercase with underscores (e.g., DATABASE_URL)"),
    (0, express_validator_1.body)("value")
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage("Value must be between 1 and 1000 characters"),
];
// Validate environment variable deletion
exports.validateEnvVarDelete = [
    (0, express_validator_1.param)("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
    (0, express_validator_1.param)("key")
        .trim()
        .matches(/^[A-Z][A-Z0-9_]*$/)
        .withMessage("Key must be uppercase with underscores"),
];
// Validate bulk environment variables update
exports.validateBulkEnvVars = [
    (0, express_validator_1.param)("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
    (0, express_validator_1.body)("envVars")
        .isArray({ min: 1 })
        .withMessage("Environment variables array is required"),
    (0, express_validator_1.body)("envVars.*.key")
        .trim()
        .matches(/^[A-Z][A-Z0-9_]*$/)
        .withMessage("All keys must be uppercase with underscores"),
    (0, express_validator_1.body)("envVars.*.value")
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage("All values must be between 1 and 1000 characters"),
];
