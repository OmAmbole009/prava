import weaviate, { Filters } from "weaviate-client";
import { CA_STATUTORY_KNOWLEDGE_BASE } from "./caRag.js";

const COLLECTION_NAME = "PravaKnowledgeBase";

let clientInstance = null;
let isInitializing = false;
let initPromise = null;

/**
 * Get or initialize the Weaviate Cloud client singleton
 */
export async function getWeaviateClient() {
  if (clientInstance) {
    try {
      const ready = await clientInstance.isReady();
      if (ready) return clientInstance;
    } catch {
      clientInstance = null;
    }
  }

  const weaviateUrl = process.env.WEAVIATE_URL;
  const weaviateApiKey = process.env.WEAVIATE_API_KEY;

  if (!weaviateUrl || !weaviateApiKey) {
    return null;
  }

  try {
    const client = await weaviate.connectToWeaviateCloud(weaviateUrl, {
      authCredentials: new weaviate.ApiKey(weaviateApiKey),
    });

    const isReady = await client.isReady();
    if (!isReady) {
      console.warn("[Weaviate] Client connected but cluster is not ready.");
      return null;
    }

    clientInstance = client;
    return clientInstance;
  } catch (error) {
    console.error("[Weaviate] Connection error:", error.message);
    return null;
  }
}

/**
 * Initialize Weaviate collections and seed statutory knowledge if empty
 */
export async function initVectorDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const client = await getWeaviateClient();
      if (!client) {
        console.warn("[Weaviate] Vector DB credentials missing or cluster unreachable.");
        return false;
      }

      console.log(`[Weaviate] Ensuring collection '${COLLECTION_NAME}' exists...`);

      const collections = await client.collections.listAll();
      const colNames = collections.map((c) => c.name);
      let col;

      if (!colNames.includes(COLLECTION_NAME)) {
        console.log(`[Weaviate] Creating '${COLLECTION_NAME}' collection with text2VecWeaviate...`);
        col = await client.collections.create({
          name: COLLECTION_NAME,
          description: "Unified Indian statutory regulations and financial documents for Prava RAG",
          vectorizers: weaviate.configure.vectorizer.text2VecWeaviate(),
          properties: [
            { name: "docId", dataType: "text" },
            { name: "docType", dataType: "text" }, // "statutory" | "business_document"
            { name: "topic", dataType: "text" },
            { name: "sections", dataType: "text" },
            { name: "keywords", dataType: "text" },
            { name: "rules", dataType: "text" },
            { name: "actionableAdvice", dataType: "text" },
            { name: "content", dataType: "text" },
            { name: "businessId", dataType: "int" },
            { name: "documentId", dataType: "int" },
            { name: "vendorName", dataType: "text" },
            { name: "invoiceNumber", dataType: "text" },
            { name: "totalAmount", dataType: "number" },
          ],
        });
      } else {
        col = client.collections.get(COLLECTION_NAME);
      }

      // Check existing statutory documents
      const existing = await col.query.fetchObjects({
        limit: 50,
        filters: col.filter.byProperty("docType").equal("statutory"),
      });

      if (existing.objects.length < CA_STATUTORY_KNOWLEDGE_BASE.length) {
        console.log(`[Weaviate] Seeding '${COLLECTION_NAME}' with Indian direct & indirect tax statutes...`);
        const existingIds = new Set(existing.objects.map((o) => o.properties.docId));

        for (const item of CA_STATUTORY_KNOWLEDGE_BASE) {
          if (existingIds.has(item.id)) continue;

          await col.data.insert({
            properties: {
              docId: item.id,
              docType: "statutory",
              topic: item.topic,
              sections: item.sections.join(", "),
              keywords: item.keywords.join(", "),
              rules: item.rules.join(" \n"),
              actionableAdvice: item.actionableAdvice,
              content: `${item.topic}\n\nSections: ${item.sections.join(", ")}\nKeywords: ${item.keywords.join(", ")}\n\nStatutory Rules:\n${item.rules.join("\n")}\n\nActionable Advice:\n${item.actionableAdvice}`,
              businessId: 0,
              documentId: 0,
              vendorName: "",
              invoiceNumber: "",
              totalAmount: 0,
            },
          });
        }
        console.log(`[Weaviate] Successfully seeded statutory knowledge base.`);
      }

      return true;
    } catch (error) {
      console.error("[Weaviate] Vector DB initialization error:", error.message);
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Perform hybrid semantic vector search over statutory CA knowledge
 */
export async function searchStatutoryRag(query, limit = 3) {
  try {
    const client = await getWeaviateClient();
    if (!client) return [];

    const col = client.collections.get(COLLECTION_NAME);
    const response = await col.query.hybrid(query, {
      limit,
      filters: col.filter.byProperty("docType").equal("statutory"),
      returnMetadata: ["score"],
    });

    if (!response.objects || response.objects.length === 0) {
      // Fall back to nearText semantic vector search
      try {
        const nearRes = await col.query.nearText(query, {
          limit,
          filters: col.filter.byProperty("docType").equal("statutory"),
          returnMetadata: ["distance"],
        });
        if (nearRes.objects && nearRes.objects.length > 0) {
          return nearRes.objects.map(formatStatutoryHit);
        }
      } catch {
        // ignore
      }
      return [];
    }

    return response.objects.map(formatStatutoryHit);
  } catch (error) {
    console.warn("[Weaviate] Statutory vector query fallback:", error.message);
    return [];
  }
}

function formatStatutoryHit(obj) {
  const p = obj.properties;
  return {
    id: p.docId,
    topic: p.topic,
    sections: typeof p.sections === "string" ? p.sections.split(", ") : [],
    keywords: typeof p.keywords === "string" ? p.keywords.split(", ") : [],
    rules: typeof p.rules === "string" ? p.rules.split(" \n") : [],
    actionableAdvice: p.actionableAdvice,
    content: p.content,
    score: obj.metadata?.score ?? (obj.metadata?.distance ? 1 - obj.metadata.distance : null),
  };
}

/**
 * Index a commercial invoice or document into Weaviate
 */
export async function indexDocumentVector(docData) {
  try {
    const client = await getWeaviateClient();
    if (!client) return false;

    const col = client.collections.get(COLLECTION_NAME);
    const summary = `${docData.invoiceType === "sales" ? "Sales Invoice" : "Purchase Invoice"} from ${docData.vendorName || "Commercial Entity"} for ₹${((docData.totalMinor || 0) / 100).toLocaleString("en-IN")}. Invoice #${docData.invoiceNumber || "N/A"}, Date: ${docData.invoiceDate || "N/A"}.`;
    const fullText = `${summary}\nGSTIN: ${docData.gstin || "N/A"}\nTaxable Amount: ₹${((docData.taxableValueMinor || 0) / 100).toLocaleString("en-IN")}\nCGST: ₹${((docData.cgstMinor || 0) / 100).toLocaleString("en-IN")}, SGST: ₹${((docData.sgstMinor || 0) / 100).toLocaleString("en-IN")}, IGST: ₹${((docData.igstMinor || 0) / 100).toLocaleString("en-IN")}\nExtracted details: ${docData.extractedText || ""}`;

    await col.data.insert({
      properties: {
        docId: `doc-${docData.documentId}`,
        docType: "business_document",
        topic: `${docData.vendorName || "Document"} Invoice #${docData.invoiceNumber || ""}`,
        sections: "",
        keywords: `${docData.vendorName || ""}, ${docData.invoiceNumber || ""}, ${docData.invoiceType || ""}`,
        rules: "",
        actionableAdvice: "",
        content: fullText,
        businessId: Number(docData.businessId),
        documentId: Number(docData.documentId),
        vendorName: docData.vendorName || "Unknown",
        invoiceNumber: docData.invoiceNumber || "",
        totalAmount: (docData.totalMinor || 0) / 100,
      },
    });
    return true;
  } catch (error) {
    console.warn("[Weaviate] Document vector indexing warning:", error.message);
    return false;
  }
}

/**
 * Search user business documents via hybrid vector search
 */
export async function searchBusinessDocumentsRag(businessId, query, limit = 4) {
  try {
    const client = await getWeaviateClient();
    if (!client) return [];

    const col = client.collections.get(COLLECTION_NAME);
    const filter = businessId
      ? Filters.and(
          col.filter.byProperty("docType").equal("business_document"),
          col.filter.byProperty("businessId").equal(Number(businessId))
        )
      : col.filter.byProperty("docType").equal("business_document");

    const response = await col.query.hybrid(query, {
      limit,
      filters: filter,
      returnMetadata: ["score"],
    });

    return response.objects.map((obj) => ({
      documentId: obj.properties.documentId,
      businessId: obj.properties.businessId,
      vendorName: obj.properties.vendorName,
      invoiceNumber: obj.properties.invoiceNumber,
      totalAmount: obj.properties.totalAmount,
      content: obj.properties.content,
      score: obj.metadata?.score,
    }));
  } catch (error) {
    console.warn("[Weaviate] Document vector search failed:", error.message);
    return [];
  }
}

/**
 * Get detailed Vector DB health & statistics
 */
export async function getVectorDbHealth() {
  const weaviateUrl = process.env.WEAVIATE_URL;
  if (!weaviateUrl || !process.env.WEAVIATE_API_KEY) {
    return {
      status: "unconfigured",
      connected: false,
      message: "WEAVIATE_URL or WEAVIATE_API_KEY environment variable is missing",
    };
  }

  try {
    const startTime = Date.now();
    const client = await getWeaviateClient();
    if (!client) {
      return {
        status: "disconnected",
        connected: false,
        message: "Failed to connect to Weaviate Cloud",
      };
    }

    const isReady = await client.isReady();
    const meta = await client.getMeta();
    const pingMs = Date.now() - startTime;

    const col = client.collections.get(COLLECTION_NAME);
    let totalObjects = 0;
    let statutoryCount = 0;
    let docCount = 0;

    try {
      const agg = await col.aggregate.overAll();
      totalObjects = agg.totalCount;

      const statAgg = await col.aggregate.overAll({
        filters: col.filter.byProperty("docType").equal("statutory"),
      });
      statutoryCount = statAgg.totalCount;

      const docAgg = await col.aggregate.overAll({
        filters: col.filter.byProperty("docType").equal("business_document"),
      });
      docCount = docAgg.totalCount;
    } catch {
      // aggregate optional
    }

    return {
      status: isReady ? "healthy" : "degraded",
      connected: isReady,
      provider: "Weaviate Cloud (WCD)",
      clusterUrl: weaviateUrl,
      version: meta.version,
      pingMs,
      collection: COLLECTION_NAME,
      stats: {
        totalVectors: totalObjects,
        statutoryStatutes: statutoryCount,
        businessDocuments: docCount,
      },
    };
  } catch (error) {
    return {
      status: "error",
      connected: false,
      message: error.message,
    };
  }
}
