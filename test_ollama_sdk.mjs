import { Ollama } from "ollama";
import fs from "fs";

async function testOllamaSdk() {
  const ollama = new Ollama({ host: "http://localhost:11434" });
  const models = await ollama.list();
  console.log("Ollama SDK connected. Available models:", models.models.map(m => m.name));

  const imagePath = new URL("test-invoice.png", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const imageBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : Buffer.from("");

  console.log("Calling qwen2.5vl:7b via Ollama JS SDK...");
  const startTime = Date.now();
  const res = await ollama.chat({
    model: "qwen2.5vl:7b",
    messages: [
      {
        role: "user",
        content: "Extract the vendor name and invoice number in JSON format: {\"vendor\": string, \"invoice_number\": string}",
        images: [imageBuffer]
      }
    ],
    format: "json",
    stream: false
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Response received in ${duration}s:`, res.message.content);
}

testOllamaSdk().catch(console.error);
