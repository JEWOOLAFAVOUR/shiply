import { PrismaClient } from "@prisma/client";
import { IDeployment } from "../../utils/types";

const prisma = new PrismaClient();

export class DeploymentModel {
  // Create a new deployment
  static async create(
    deploymentData: Omit<IDeployment, "id" | "createdAt" | "updatedAt">
  ) {
    return await prisma.deployment.create({
      data: deploymentData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            framework: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Find deployment by ID
  static async findById(id: string) {
    return await prisma.deployment.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            framework: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Find deployments by project ID
  static async findByProjectId(projectId: string) {
    return await prisma.deployment.findMany({
      where: { projectId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            framework: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Find deployments by user ID
  static async findByUserId(userId: string) {
    return await prisma.deployment.findMany({
      where: { userId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            framework: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Update deployment
  static async update(
    id: string,
    deploymentData: Partial<Omit<IDeployment, "id" | "createdAt" | "updatedAt">>
  ) {
    return await prisma.deployment.update({
      where: { id },
      data: deploymentData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            framework: true,
          },
        },
      },
    });
  }

  // Update deployment status
  static async updateStatus(
    id: string,
    status: "PENDING" | "BUILDING" | "SUCCESS" | "FAILED" | "CANCELLED"
  ) {
    return await prisma.deployment.update({
      where: { id },
      data: { status },
    });
  }

  // Update build logs
  static async updateBuildLogs(id: string, buildLogs: string) {
    return await prisma.deployment.update({
      where: { id },
      data: { buildLogs },
    });
  }

  // Get deployment statistics
  static async getStats(userId?: string) {
    const where = userId ? { userId } : {};

    return await prisma.deployment.groupBy({
      by: ["status"],
      where,
      _count: {
        status: true,
      },
    });
  }

  // Delete deployment
  static async delete(id: string) {
    return await prisma.deployment.delete({
      where: { id },
    });
  }
}

export const Deployment = DeploymentModel;
