import { PrismaClient } from "@prisma/client";
import { IUser } from "../../utils/types";

const prisma = new PrismaClient();

export class UserModel {
  // Create a new user
  static async create(userData: Omit<IUser, "id" | "createdAt" | "updatedAt">) {
    return await prisma.user.create({
      data: userData,
    });
  }

  // Find user by ID
  static async findById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        projects: true,
        deployments: true,
      },
    });
  }

  // Find user by email
  static async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  // Find user by username
  static async findByUsername(username: string) {
    return await prisma.user.findUnique({
      where: { username },
    });
  }

  // Update user
  static async update(
    id: string,
    userData: Partial<Omit<IUser, "id" | "createdAt" | "updatedAt">>
  ) {
    return await prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  // Delete user
  static async delete(id: string) {
    return await prisma.user.delete({
      where: { id },
    });
  }

  // Find all users (for admin purposes)
  static async findAll() {
    return await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            deployments: true,
          },
        },
      },
    });
  }
}

// Export both the class and a compatible User object
export const User = UserModel;
export { User as default };
