"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.validateUser = exports.validateLogin = void 0;
const express_validator_1 = require("express-validator");
exports.validateLogin = [
    (0, express_validator_1.check)("email").normalizeEmail().isEmail().withMessage("Email is invalid"),
    (0, express_validator_1.check)("password")
        .trim()
        .not()
        .isEmpty()
        .withMessage("Password is missing!")
        .isLength({ min: 6, max: 20 })
        .withMessage("Password must be between 6 to 20 characters long!"),
];
exports.validateUser = [
    (0, express_validator_1.check)("username")
        .trim()
        .not()
        .isEmpty()
        .withMessage("Username is required")
        .isLength({ min: 3, max: 15 })
        .withMessage("Username must be between 3 to 15 characters"),
    (0, express_validator_1.check)("email").normalizeEmail().isEmail().withMessage("Email is invalid"),
    (0, express_validator_1.check)("password")
        .trim()
        .not()
        .isEmpty()
        .withMessage("Password is missing!")
        .isLength({ min: 6, max: 20 })
        .withMessage("Password must be between 6 to 20 characters long!"),
];
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req).array();
    if (!errors.length)
        return next();
    res.status(400).json({ success: false, error: errors[0].msg });
};
exports.validate = validate;
