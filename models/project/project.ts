import { PrismaClient } from "@prisma/client";
import { IProject } from "../../utils/types";

const prisma = new PrismaClient();

export class ProjectModel {
  // Create a new project
  static async create(
    projectData: Omit<IProject, "id" | "createdAt" | "updatedAt">
  ) {
    return await prisma.project.create({
      data: projectData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        envVars: true,
        deployments: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  // Find project by ID
  static async findById(id: string) {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        envVars: true,
        deployments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  // Find projects by user ID
  static async findByUserId(userId: string) {
    return await prisma.project.findMany({
      where: { userId },
      include: {
        envVars: true,
        deployments: {
          take: 3,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            deployments: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Update project
  static async update(
    id: string,
    projectData: Partial<Omit<IProject, "id" | "createdAt" | "updatedAt">>
  ) {
    return await prisma.project.update({
      where: { id },
      data: projectData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        envVars: true,
      },
    });
  }

  // Delete project
  static async delete(id: string) {
    return await prisma.project.delete({
      where: { id },
    });
  }

  // Find all projects (for admin)
  static async findAll() {
    return await prisma.project.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            deployments: true,
            envVars: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Update project status
  static async updateStatus(
    id: string,
    status: "ACTIVE" | "INACTIVE" | "BUILDING" | "ERROR"
  ) {
    return await prisma.project.update({
      where: { id },
      data: { status },
    });
  }
}

export const Project = ProjectModel;
