import { Request, Response, NextFunction } from "express";
import axios from "axios";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 502;
    const payload = err.response?.data ?? { error: "upstream_error", message: err.message };
    return res.status(status).json(payload);
  }
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "internal_error", message: "Internal server error" });
}
