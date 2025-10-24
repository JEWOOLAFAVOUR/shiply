"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = void 0;
const sendError = (res, status = 404, message = "Not found", error = null) => {
    const response = {
        success: false,
        message,
        error,
    };
    if (error) {
        response.error = error;
    }
    res.status(status).json(response);
};
exports.sendError = sendError;
