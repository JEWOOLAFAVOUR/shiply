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
exports.EnvVar = exports.EnvVarModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EnvVarModel {
    // Create environment variable
    static create(envVarData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.envVar.create({
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
        });
    }
    // Find by project ID
    static findByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.envVar.findMany({
                where: { projectId },
                orderBy: { key: "asc" },
            });
        });
    }
    // Find by project ID and key
    static findByProjectAndKey(projectId, key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.envVar.findUnique({
                where: {
                    projectId_key: {
                        projectId,
                        key,
                    },
                },
            });
        });
    }
    // Update environment variable
    static update(id, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.envVar.update({
                where: { id },
                data: { value },
            });
        });
    }
    // Update or create environment variable
    static upsert(projectId, key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.envVar.upsert({
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
        });
    }
    // Delete environment variable
    static delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.envVar.delete({
                where: { id },
            });
        });
    }
    // Delete by project and key
    static deleteByProjectAndKey(projectId, key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.envVar.delete({
                where: {
                    projectId_key: {
                        projectId,
                        key,
                    },
                },
            });
        });
    }
    // Bulk create environment variables
    static createMany(projectId, envVars) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = envVars.map((envVar) => ({
                projectId,
                key: envVar.key,
                value: envVar.value,
            }));
            return yield prisma.envVar.createMany({
                data,
                skipDuplicates: true,
            });
        });
    }
    // Delete all environment variables for a project
    static deleteAllByProject(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.envVar.deleteMany({
                where: { projectId },
            });
        });
    }
}
exports.EnvVarModel = EnvVarModel;
exports.EnvVar = EnvVarModel;
