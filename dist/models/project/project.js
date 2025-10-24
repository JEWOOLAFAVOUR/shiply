"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = exports.ProjectModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ProjectModel {
    // Create a new project
    static create(projectData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.project.create({
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
        });
    }
    // Find project by ID
    static findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.project.findUnique({
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
        });
    }
    // Find projects by user ID
    static findByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.project.findMany({
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
        });
    }
    // Update project
    static update(id, projectData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.project.update({
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
        });
    }
    // Delete project
    static delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.project.delete({
                where: { id },
            });
        });
    }
    // Find all projects (for admin)
    static findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.project.findMany({
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
        });
    }
    // Update project status
    static updateStatus(id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.project.update({
                where: { id },
                data: { status },
            });
        });
    }
}
exports.ProjectModel = ProjectModel;
exports.Project = ProjectModel;
