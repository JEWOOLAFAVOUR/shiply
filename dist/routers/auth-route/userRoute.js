"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = __importDefault(require("../../controllers/auth-controller/userController"));
const validator_1 = require("../../middlewares/validator");
const router = (0, express_1.Router)();
// USER
router.post("/register", validator_1.validateUser, validator_1.validate, userController_1.default.createUser);
router.post("/login", validator_1.validateLogin, validator_1.validate, userController_1.default.loginUser);
router.get("/users", userController_1.default.getAllUsers);
exports.default = router;
