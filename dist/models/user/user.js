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
exports.User = exports.UserModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UserModel {
    // Create a new user
    static create(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.user.create({
                data: userData,
            });
        });
    }
    // Find user by ID
    static findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.user.findUnique({
                where: { id },
                include: {
                    projects: true,
                    deployments: true,
                },
            });
        });
    }
    // Find user by email
    static findByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.user.findUnique({
                where: { email },
            });
        });
    }
    // Find user by username
    static findByUsername(username) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.user.findUnique({
                where: { username },
            });
        });
    }
    // Update user
    static update(id, userData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.user.update({
                where: { id },
                data: userData,
            });
        });
    }
    // Delete user
    static delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.user.delete({
                where: { id },
            });
        });
    }
    // Find all users (for admin purposes)
    static findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.user.findMany({
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
        });
    }
}
exports.UserModel = UserModel;
// For backward compatibility, export as User
exports.User = UserModel;
