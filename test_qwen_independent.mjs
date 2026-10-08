import fs from "fs";

async function testQwen() {
  const imagePath = new URL("test-invoice.png", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const imageBase64 = fs.existsSync(imagePath) ? fs.readFileSync(imagePath).toString("base64") : "";

  const prompt = `You are a high-precision GST tax invoice data extractor.
Analyze this invoice image carefully and extract all information into strict JSON format with this exact structure:
{
  "vendor": {
    "name": string or null,
    "gstin": string or null,
    "address": string or null
  },
  "invoice": {
    "number": string or null,
    "date": string or null,
    "due_date": string or null
  },
  "buyer": {
    "name": string or null,
    "gstin": string or null,
    "address": string or null
  },
  "amounts": {
    "subtotal": number or null,
    "discount": number or null,
    "taxable_amount": number or null,
    "cgst": number or null,
    "sgst": number or null,
    "igst": number or null,
    "total_tax": number or null,
    "total_amount": number or null
  },
  "items": [
    {
      "description": string or null,
      "hsn_sac": string or null,
      "quantity": number or null,
      "unit": string or null,
      "rate": number or null,
      "tax_rate": number or null,
      "tax_amount": number or null,
      "amount": number or null
    }
  ]
}

Rules:
- Output ONLY valid JSON, with no markdown code blocks and no surrounding commentary.
- Use null when information is not visible.
- Never invent values.`;

  console.log("Sending invoice image to Ollama qwen2.5vl:7b...");
  const startTime = Date.now();

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5vl:7b",
      messages: [
        {
          role: "user",
          content: prompt,
          images: [imageBase64]
        }
      ],
      stream: false,
      format: "json"
    })
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Received response in ${duration}s. Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Ollama API Error:", errorText);
    return;
  }

  const data = await response.json();
  console.log("\n--- RAW MODEL OUTPUT ---");
  console.log(data.message?.content);

  try {
    const parsed = JSON.parse(data.message?.content);
    console.log("\n--- JSON PARSE SUCCESSFUL ---");
    console.log(JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error("\nFailed to parse JSON:", err.message);
  }
}

testQwen().catch(console.error);
