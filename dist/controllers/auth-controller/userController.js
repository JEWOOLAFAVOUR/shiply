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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_1 = require("../../models/user/user");
const crypto_js_1 = __importDefault(require("crypto-js"));
const verifyToken_1 = require("../../middlewares/verifyToken");
const helper_1 = require("../../utils/helper");
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password, avatar } = req.body;
        const secret_key = process.env.PASS_SEC;
        if (!secret_key) {
            throw new Error("error variable ");
        }
        // Check if user already exists (check both email and username)
        const existingUserByEmail = yield user_1.User.findByEmail(email);
        const existingUserByUsername = yield user_1.User.findByUsername(username);
        if (existingUserByEmail || existingUserByUsername) {
            return (0, helper_1.sendError)(res, 400, "Username or Email already exists");
        }
        const hashedPassword = crypto_js_1.default.AES.encrypt(password, secret_key).toString();
        let picked_avatar = avatar || 1;
        // Create new user using Prisma
        const newUser = yield user_1.User.create({
            username,
            email,
            password: hashedPassword,
            avatar: picked_avatar,
        });
        // Generate JWT token
        const token = (0, verifyToken_1.generateAccessToken)(newUser.id, false);
        res.status(201).json({
            message: "User created successfully",
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                avatar: newUser.avatar,
                token,
            },
        });
    }
    catch (error) {
        console.error("Create user error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const secret_key = process.env.PASS_SEC;
        if (!secret_key) {
            throw new Error("error variable ");
        }
        // Check if user exists
        const user = yield user_1.User.findByEmail(email);
        if (!user)
            return (0, helper_1.sendError)(res, 400, "Invalid email or password");
        // Decrypt and compare password
        const decryptedPassword = crypto_js_1.default.AES.decrypt(user.password, secret_key).toString(crypto_js_1.default.enc.Utf8);
        if (decryptedPassword !== password) {
            return (0, helper_1.sendError)(res, 400, "Invalid email or password");
        }
        // Generate JWT token
        const token = (0, verifyToken_1.generateAccessToken)(user.id, false);
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                token,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_1.User.findAll();
        res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            data: users,
        });
    }
    catch (error) {
        console.error("Get all users error:", error);
        return (0, helper_1.sendError)(res, 500, "Internal server error");
    }
});
exports.default = { createUser, loginUser, getAllUsers };
