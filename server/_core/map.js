/**
 * Google Maps API Integration
 */
import { ENV } from "./env.js";

function getMapsConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Google Maps proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
  };
}

/**
 * Make authenticated requests to Google Maps APIs
 */
export async function makeRequest(
  endpoint,
  params = {},
  options = {}
) {
  const { baseUrl, apiKey } = getMapsConfig();

  // Clean endpoint format
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append("key", apiKey);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join("|"));
      } else {
        queryParams.append(key, String(value));
      }
    }
  }

  const url = `${baseUrl}${cleanEndpoint}?${queryParams.toString()}`;

  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (options.body && options.method === "POST") {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Maps API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return await response.json();
}
