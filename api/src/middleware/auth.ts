import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  user?: JwtPayload & {
    userId: string;
    email: string;
    iat: number;
    exp: number;
  };
  validatedBody?: any;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as JwtPayload;
    req.user = decoded as AuthRequest["user"];
    req.userId = decoded.userId as string;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as JwtPayload;
      req.user = decoded as AuthRequest["user"];
      req.userId = decoded.userId as string;
    } catch (error) {
      // Token invalid, but continue without auth
    }
  }

  next();
};
