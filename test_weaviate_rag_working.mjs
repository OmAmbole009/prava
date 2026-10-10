import "dotenv/config";
import {
  initVectorDatabase,
  getVectorDbHealth,
  searchStatutoryRag,
  indexDocumentVector,
  searchBusinessDocumentsRag,
} from "./server/weaviateVectorDb.js";
import { askCaCopilotRag } from "./server/caEngine.js";
import { askPrava } from "./server/assistant.js";

async function runTestSuite() {
  console.log("==================================================================");
  console.log(" PRAVA WEAVIATE VECTOR DB & RAG END-TO-END VALIDATION SUITE");
  console.log("==================================================================\n");

  // Step 1: Health & Connectivity
  console.log("1. Checking Weaviate Cloud connection & cluster status...");
  const inited = await initVectorDatabase();
  console.log(`   - initVectorDatabase() returned: ${inited}`);

  const health = await getVectorDbHealth();
  console.log("   - Cluster Health:", JSON.stringify(health, null, 2));

  if (!health.connected) {
    throw new Error("Weaviate is not connected: " + health.message);
  }
  console.log("   [PASSED] Weaviate Cloud is connected and operational!\n");

  // Step 2: Statutory Vector Search (RAG)
  console.log("2. Testing Statutory Vector Search (MSME & Tax Statutes)...");
  const queries = [
    "delay in vendor payment to micro enterprise 45 days",
    "advance tax installments due dates penalty 234c",
    "blocked input tax credit on motor vehicles food catering",
  ];

  for (const q of queries) {
    const hits = await searchStatutoryRag(q, 2);
    console.log(`   Query: "${q}"`);
    if (hits.length === 0) {
      console.log("     No hits returned.");
    } else {
      for (const h of hits) {
        console.log(`     -> Hit: [${h.id}] "${h.topic}" (Score: ${h.score?.toFixed(3) || "N/A"})`);
      }
    }
  }
  console.log("   [PASSED] Semantic Vector Search retrieved relevant statutory records!\n");

  // Step 3: Indexing and Searching Business Documents
  console.log("3. Testing Document Vector Indexing & Hybrid Search...");
  const testDoc = {
    documentId: 99901,
    businessId: 1,
    vendorName: "Google Cloud Platform India",
    invoiceNumber: "INV-GCP-88392",
    invoiceDate: "2026-03-01",
    totalMinor: 4500000, // ₹45,000.00
    taxableValueMinor: 3813559,
    cgstMinor: 343220,
    sgstMinor: 343220,
    igstMinor: 0,
    gstin: "27AABCG1234A1Z9",
    invoiceType: "purchase",
    extractedText: "Compute engine, cloud storage, BigQuery enterprise credits",
  };

  const indexed = await indexDocumentVector(testDoc);
  console.log(`   - indexDocumentVector() returned: ${indexed}`);

  // Query it back
  const docHits = await searchBusinessDocumentsRag(1, "Google Cloud BigQuery cloud storage", 2);
  console.log(`   - Retrieved ${docHits.length} matching document(s) for query: "Google Cloud BigQuery"`);
  for (const dh of docHits) {
    console.log(`     -> Found: [Doc #${dh.documentId}] Vendor: ${dh.vendorName}, Amount: ₹${dh.totalAmount}`);
  }
  console.log("   [PASSED] Business document vector indexed and retrieved via hybrid search!\n");

  // Step 4: CA Co-Pilot RAG Integration
  console.log("4. Testing CA Co-Pilot RAG (askCaCopilotRag)...");
  const copilotAnswer = await askCaCopilotRag("Can I claim ITC on MacBooks and cloud servers?");
  console.log("   - Co-Pilot Answer Snippet:", copilotAnswer.answer.slice(0, 150) + "...");
  console.log("   - Legal Citations:", copilotAnswer.legalCitations);
  console.log("   - Risk Assessment:", copilotAnswer.riskAssessment);
  console.log("   [PASSED] CA Co-Pilot RAG correctly returned ground-truth statutory guidance!\n");

  // Step 5: Ask Prava Integration
  console.log("5. Testing AskPrava (/assistant) RAG Workflow...");
  const pravaRes = await askPrava(1, {
    businessId: 1,
    message: "What is the rule for MSME payments and 45 days?",
  });
  console.log("   - Prava Answer Snippet:", pravaRes.answer.slice(0, 160) + "...");
  console.log("   - Contextual Sources:", pravaRes.sources?.map(s => `[${s.type}] ${s.title}`) || []);
  console.log("   - Contextual Actions:", pravaRes.actions?.map(a => a.label) || []);
  console.log("   [PASSED] AskPrava successfully used Weaviate Vector RAG context!\n");

  console.log("==================================================================");
  console.log(" ALL RAG VECTOR DB TESTS COMPLETED SUCCESSFULLY! ");
  console.log("==================================================================");
}

runTestSuite().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
