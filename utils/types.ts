import jwt, { JwtPayload } from "jsonwebtoken";
import { User, Project, Deployment, EnvVar } from "@prisma/client";
import * as Express from "express";

// User Types
export interface IUser {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Project Types
export interface IProject {
  id: string;
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  framework: string;
  status: "ACTIVE" | "INACTIVE" | "BUILDING" | "ERROR";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Deployment Types
export interface IDeployment {
  id: string;
  version: string;
  status: "PENDING" | "BUILDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  buildLogs?: string | null;
  deployUrl?: string | null;

  // Docker-specific fields
  dockerImageId?: string | null;
  dockerImageName?: string | null;
  containerName?: string | null;
  containerPort?: number | null;
  hostPort?: number | null;
  containerStatus?: string | null;

  // Deployment configuration
  memoryLimit?: number | null;
  cpuLimit?: number | null;

  projectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Environment Variable Types
export interface IEnvVar {
  id: string;
  key: string;
  value: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface BaseResponse {
  success: boolean;
  message: string;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: true;
}

export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  error: false;
  data?: T;
}

// Express Request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: string };
      userId?: string;
    }
  }
}

// Prisma Types Export (for direct use)
export type { User, Project, Deployment, EnvVar } from "@prisma/client";
