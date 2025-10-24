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
exports.verifyTokenAndAuthorization = exports.verifyToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const helper_1 = require("../utils/helper");
const user_1 = require("../models/user/user");
const generateAccessToken = (userId, isAdmin) => {
    return jsonwebtoken_1.default.sign({ id: userId, isAdmin }, process.env.JWT_SECRET, {
        expiresIn: "40d",
    });
};
exports.generateAccessToken = generateAccessToken;
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return (0, helper_1.sendError)(res, 401, "You are not authenticated");
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded user details to request
        req.userId = decoded.id; // Add userId for easier access
        next();
    }
    catch (err) {
        return (0, helper_1.sendError)(res, 403, "Invalid token");
    }
};
exports.verifyToken = verifyToken;
const verifyTokenAndAuthorization = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return (0, helper_1.sendError)(res, 403, "User not authorized");
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        const user = yield user_1.User.findById(decoded.id);
        if (!user) {
            return (0, helper_1.sendError)(res, 404, "User does not exist");
        }
        req.user = user;
        next();
    }
    catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message,
        });
    }
});
exports.verifyTokenAndAuthorization = verifyTokenAndAuthorization;
