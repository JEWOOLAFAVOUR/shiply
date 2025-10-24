import { body, param } from "express-validator";

// Validate project creation
export const validateCreateProject = [
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
  body("envVars")
    .optional()
    .isArray()
    .withMessage("Environment variables must be an array"),
  body("envVars.*.key")
    .if(body("envVars").exists())
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      "Environment variable key must be between 1 and 100 characters"
    ),
  body("envVars.*.value")
    .if(body("envVars").exists())
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage(
      "Environment variable value must be between 1 and 1000 characters"
    ),
];

// Validate project update
export const validateUpdateProject = [
  param("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
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
export const validateProjectId = [
  param("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
];

// Validate project status update
export const validateProjectStatus = [
  param("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
  body("status")
    .isIn(["ACTIVE", "INACTIVE", "BUILDING", "ERROR"])
    .withMessage("Invalid status"),
];

// Validate environment variable creation/update
export const validateEnvVar = [
  param("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
  body("key")
    .trim()
    .matches(/^[A-Z][A-Z0-9_]*$/)
    .withMessage("Key must be uppercase with underscores (e.g., DATABASE_URL)"),
  body("value")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Value must be between 1 and 1000 characters"),
];

// Validate environment variable deletion
export const validateEnvVarDelete = [
  param("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
  param("key")
    .trim()
    .matches(/^[A-Z][A-Z0-9_]*$/)
    .withMessage("Key must be uppercase with underscores"),
];

// Validate bulk environment variables update
export const validateBulkEnvVars = [
  param("projectId").isLength({ min: 1 }).withMessage("Project ID is required"),
  body("envVars")
    .isArray({ min: 1 })
    .withMessage("Environment variables array is required"),
  body("envVars.*.key")
    .trim()
    .matches(/^[A-Z][A-Z0-9_]*$/)
    .withMessage("All keys must be uppercase with underscores"),
  body("envVars.*.value")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("All values must be between 1 and 1000 characters"),
];
