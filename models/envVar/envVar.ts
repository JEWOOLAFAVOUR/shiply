import { PrismaClient } from "@prisma/client";
import { IEnvVar } from "../../utils/types";

const prisma = new PrismaClient();

export class EnvVarModel {
  // Create environment variable
  static async create(
    envVarData: Omit<IEnvVar, "id" | "createdAt" | "updatedAt">
  ) {
    return await prisma.envVar.create({
      data: envVarData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Find by project ID
  static async findByProjectId(projectId: string) {
    return await prisma.envVar.findMany({
      where: { projectId },
      orderBy: { key: "asc" },
    });
  }

  // Find by project ID and key
  static async findByProjectAndKey(projectId: string, key: string) {
    return await prisma.envVar.findUnique({
      where: {
        projectId_key: {
          projectId,
          key,
        },
      },
    });
  }

  // Update environment variable
  static async update(id: string, value: string) {
    return await prisma.envVar.update({
      where: { id },
      data: { value },
    });
  }

  // Update or create environment variable
  static async upsert(projectId: string, key: string, value: string) {
    return await prisma.envVar.upsert({
      where: {
        projectId_key: {
          projectId,
          key,
        },
      },
      update: { value },
      create: {
        projectId,
        key,
        value,
      },
    });
  }

  // Delete environment variable
  static async delete(id: string) {
    return await prisma.envVar.delete({
      where: { id },
    });
  }

  // Delete by project and key
  static async deleteByProjectAndKey(projectId: string, key: string) {
    return await prisma.envVar.delete({
      where: {
        projectId_key: {
          projectId,
          key,
        },
      },
    });
  }

  // Bulk create environment variables
  static async createMany(
    projectId: string,
    envVars: Array<{ key: string; value: string }>
  ) {
    const data = envVars.map((envVar) => ({
      projectId,
      key: envVar.key,
      value: envVar.value,
    }));

    return await prisma.envVar.createMany({
      data,
      skipDuplicates: true,
    });
  }

  // Delete all environment variables for a project
  static async deleteAllByProject(projectId: string) {
    return await prisma.envVar.deleteMany({
      where: { projectId },
    });
  }
}

export const EnvVar = EnvVarModel;
