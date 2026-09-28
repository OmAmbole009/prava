import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG, NOT_CA_ERR_MSG } from "../../shared/const.js";
import { sdk } from "./sdk.js";

export async function authenticate(req, res, next) {
  try {
    req.user = await sdk.authenticateRequest(req);
  } catch (error) {
    req.user = null;
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: { message: UNAUTHED_ERR_MSG } });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: { message: NOT_ADMIN_ERR_MSG } });
  }
  next();
}

export function requireCa(req, res, next) {
  if (!req.user || (req.user.role !== "ca" && req.user.role !== "admin")) {
    return res.status(403).json({ error: { message: NOT_CA_ERR_MSG } });
  }
  next();
}

export function sendData(res, data, status = 200) {
  return res.status(status).json({ data });
}

export function sendError(res, error, fallbackStatus = 500) {
  const status =
    error?.statusCode ||
    error?.status ||
    (error?.message === UNAUTHED_ERR_MSG
      ? 401
      : error?.message === NOT_ADMIN_ERR_MSG || error?.message === NOT_CA_ERR_MSG
      ? 403
      : fallbackStatus);
  return res.status(status).json({ error: { message: error?.message || "Internal server error" } });
}
