"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapMiddleware = void 0;
const wrapMiddleware = (middleware) => {
    return (req, res, next) => {
        return middleware(req, res, next);
    };
};
exports.wrapMiddleware = wrapMiddleware;
