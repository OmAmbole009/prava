/**
 * Base HTTP error class with status code.
 * Throw this from route handlers to send specific HTTP errors.
 */
export class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message user-facing message
   * @param {{ code?: string, hint?: string, details?: unknown }} [options]
   *   `code` is a machine-readable identifier the client can act on;
   *   `hint` is extra actionable guidance shown under the message.
   */
  constructor(statusCode, message, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
    if (options.code) this.code = options.code;
    if (options.hint) this.hint = options.hint;
    if (options.details !== undefined) this.details = options.details;
  }
}

// Convenience constructors
export const BadRequestError = (msg) => new HttpError(400, msg);
export const UnauthorizedError = (msg) => new HttpError(401, msg);
export const ForbiddenError = (msg) => new HttpError(403, msg);
export const NotFoundError = (msg) => new HttpError(404, msg);
