import { HttpError } from "../../shared/_core/errors.js";
import { ENV } from "./env.js";

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value) => value.trim();
const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new HttpError(400, "Notification title is required.");
  }
  if (!isNonEmptyString(input.content)) {
    throw new HttpError(400, "Notification content is required.");
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new HttpError(400, `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`);
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new HttpError(400, `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`);
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification through the Manus Notification Service.
 * Returns `true` if the request was accepted, `false` when the upstream service
 * cannot be reached (callers can fall back to email/slack). Validation errors
 * bubble up as HTTP errors so callers can fix the payload.
 */
export async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);

  if (!ENV.forgeApiUrl) {
    throw new HttpError(500, "Notification service URL is not configured.");
  }

  if (!ENV.forgeApiKey) {
    throw new HttpError(500, "Notification service API key is not configured.");
  }

  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
