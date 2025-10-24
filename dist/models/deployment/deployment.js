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
exports.Deployment = exports.DeploymentModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DeploymentModel {
    // Create a new deployment
    static create(deploymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.deployment.create({
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
        });
    }
    // Find deployment by ID
    static findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.deployment.findUnique({
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
        });
    }
    // Find deployments by project ID
    static findByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.deployment.findMany({
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
        });
    }
    // Find deployments by user ID
    static findByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.deployment.findMany({
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
        });
    }
    // Update deployment
    static update(id, deploymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.deployment.update({
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
        });
    }
    // Update deployment status
    static updateStatus(id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.deployment.update({
                where: { id },
                data: { status },
            });
        });
    }
    // Update build logs
    static updateBuildLogs(id, buildLogs) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.deployment.update({
                where: { id },
                data: { buildLogs },
            });
        });
    }
    // Get deployment statistics
    static getStats(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = userId ? { userId } : {};
            return yield prisma.deployment.groupBy({
                by: ["status"],
                where,
                _count: {
                    status: true,
                },
            });
        });
    }
    // Delete deployment
    static delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.deployment.delete({
                where: { id },
            });
        });
    }
}
exports.DeploymentModel = DeploymentModel;
exports.Deployment = DeploymentModel;
