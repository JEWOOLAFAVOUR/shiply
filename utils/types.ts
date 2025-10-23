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
export interface ErrorResponse {
  success: boolean;
  error: boolean;
  message: string;
}

export interface SuccessResponse<T = any> {
  success: boolean;
  error: boolean;
  message: string;
  data?: T;
}

// Custom Request Types
export interface CustomRequest extends Express.Request {
  user?: JwtPayload | null;
  userId?: string;
}

// Prisma Types Export (for direct use)
export type { User, Project, Deployment, EnvVar } from "@prisma/client";
