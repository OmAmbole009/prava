import { ENV } from "./env.js";

export async function transcribeAudio(options) {
  const { audioUrl, language, prompt } = options;

  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "speechtotext.v1.SpeechToTextService/TranscribeAudio",
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
      audio_url: audioUrl,
      language: language,
      prompt: prompt,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Voice transcription failed (${response.status} ${response.statusText})${
        detail ? `: ${detail}` : ""
      }`
    );
  }

  return await response.json();
}
