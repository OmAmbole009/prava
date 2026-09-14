import { storagePut } from "../storage.js";
import { ENV } from "./env.js";

const DEFAULT_IMAGE_MODEL = "MODEL_GPT_IMAGE_2";
const DEFAULT_IMAGE_QUALITY = "medium";

export async function generateImage(options) {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
      "content-type": "application/json",
      "connect-protocol-version": "1",
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages?.map((img) => ({
        url: img.url,
        b64_json: img.b64Json,
        mime_type: img.mimeType,
      })),
      model: options.model ?? DEFAULT_IMAGE_MODEL,
      quality: options.quality ?? DEFAULT_IMAGE_QUALITY,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation failed (${response.status} ${response.statusText})${
        detail ? `: ${detail}` : ""
      }`
    );
  }

  const result = await response.json();
  const imageObj = result.image;
  if (!imageObj) {
    throw new Error("Image generation failed: No image in response");
  }

  // If the service returned a URL, return it directly
  if (imageObj.url) {
    return { url: imageObj.url };
  }

  // If the service returned base64 data, upload to S3 and return the URL
  if (imageObj.b64_json) {
    const buffer = Buffer.from(imageObj.b64_json, "base64");
    const mimeType = imageObj.mime_type || "image/png";
    const extension = mimeType.split("/")[1] || "png";
    const filename = `generated/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${extension}`;

    const { url } = await storagePut(filename, buffer, mimeType);
    return { url };
  }

  throw new Error("Image generation failed: Invalid image data in response");
}
