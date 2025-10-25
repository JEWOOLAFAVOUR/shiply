import { Request, Response, NextFunction, RequestHandler } from "express";

export const wrapMiddleware = (
  middleware: (req: Request, res: Response, next: NextFunction) => void
): RequestHandler => {
  return (req, res, next) => {
    return middleware(req, res, next);
  };
};
