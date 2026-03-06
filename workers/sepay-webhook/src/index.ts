/**
 * SePay Webhook Handler for NhauJS
 *
 * Receives POST from SePay when a bank transaction occurs,
 * parses the payment code from transaction content,
 * and updates Firestore to mark the bill as paid.
 *
 * Payment code format: NHAU{4 chars pollId}{4 chars userId}
 */

interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY: string;
  BANK_ACCOUNT_NUMBER: string;
  SEPAY_WEBHOOK_SECRET?: string;
}

interface SepayPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount: string | null;
  transferType: string; // "in" or "out"
  transferAmount: number;
  accumulated: number;
  code: string | null;
  content: string;
  referenceCode: string;
  description: string;
}

// Firestore REST API helper
async function firestoreGet(
  projectId: string,
  apiKey: string,
  collectionPath: string,
  documentId: string
): Promise<any> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}/${documentId}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore GET failed: ${res.status} - ${err}`);
  }
  return res.json();
}

// Firestore REST API - Update specific fields
async function firestoreUpdate(
  projectId: string,
  apiKey: string,
  documentPath: string,
  fields: Record<string, any>,
  updateMask: string[]
): Promise<any> {
  const maskParams = updateMask.map((m) => `updateMask.fieldPaths=${m}`).join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}?${maskParams}&key=${apiKey}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore PATCH failed: ${res.status} - ${err}`);
  }
  return res.json();
}

// Convert JS value to Firestore Value format
function toFirestoreValue(val: any): any {
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "boolean") return { booleanValue: val };
  if (val === null) return { nullValue: null };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Parse Firestore document fields to plain JS object
function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

function parseFirestoreValue(val: any): any {
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ("mapValue" in val) {
    return parseFirestoreFields(val.mapValue.fields || {});
  }
  return null;
}

// Extract payment code from transaction content
// SePay sends the code in `code` field or embedded in `content`
function extractPaymentCode(payload: SepayPayload): string | null {
  // First, check the `code` field
  if (payload.code && payload.code.startsWith("NHAU")) {
    return payload.code;
  }

  // Fallback: search in content string
  const content = (payload.content || "").toUpperCase();
  const match = content.match(/NHAU[A-Z0-9]{8}/);
  if (match) {
    return match[0];
  }

  return null;
}

// Search for matching bill item across all poll collections
async function findAndUpdatePayment(
  env: Env,
  paymentCode: string,
  amount: number,
  referenceCode: string
): Promise<{ success: boolean; message: string }> {
  // Try all collection prefixes: default (nhauJS), ob_ (only-bill), du2_
  const prefixes = ["", "ob_", "du2_"];

  for (const prefix of prefixes) {
    const collName = `${prefix}polls`;

    // List all polls to find the matching payment code
    const listUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collName}?key=${env.FIREBASE_API_KEY}&pageSize=100`;

    try {
      const listRes = await fetch(listUrl);
      if (!listRes.ok) continue;

      const listData: any = await listRes.json();
      const documents = listData.documents || [];

      for (const doc of documents) {
        const fields = doc.fields;
        if (!fields?.bill?.mapValue?.fields?.items?.mapValue?.fields) continue;

        const billItems = fields.bill.mapValue.fields.items.mapValue.fields;

        // Search through all user items for matching payment code
        for (const [userId, itemVal] of Object.entries(billItems) as any) {
          const itemFields = itemVal.mapValue?.fields;
          if (!itemFields) continue;

          const itemPaymentCode = itemFields.paymentCode?.stringValue;
          if (itemPaymentCode !== paymentCode) continue;

          // Found matching payment code
          const isPaid = itemFields.isPaid?.booleanValue;
          if (isPaid) {
            return { success: true, message: `Already marked as paid for ${userId}` };
          }

          // Check amount (allow slight overpayment, reject underpayment by > 5%)
          const expectedAmount =
            (Number(itemFields.amount?.integerValue || 0)) +
            (Number(itemFields.round2Amount?.integerValue || 0)) +
            (Number(itemFields.taxiAmount?.integerValue || 0));

          if (amount < expectedAmount * 0.95) {
            return {
              success: false,
              message: `Underpayment: received ${amount} but expected ${expectedAmount}`,
            };
          }

          // Extract document path from the full document name
          const docPath = doc.name.split("/documents/")[1];

          // Build the update for nested field: bill.items.{userId}.isPaid etc.
          // Unfortunately Firestore REST API needs the full bill object for nested updates
          // So we update the individual fields using dot notation in updateMask
          const updateFields: Record<string, any> = {};

          // We need to rebuild the entire bill.items.{userId} map
          const updatedItem = {
            ...parseFirestoreFields(itemFields),
            isPaid: true,
            paidAmount: amount,
            paidAt: Date.now(),
          };

          // Build the full bill structure for update
          const currentBillFields = parseFirestoreFields(fields.bill.mapValue.fields);
          const currentItems = currentBillFields.items || {};
          currentItems[userId] = updatedItem;

          // Update the bill field
          const updatedBill = { ...currentBillFields, items: currentItems };

          await firestoreUpdate(
            env.FIREBASE_PROJECT_ID,
            env.FIREBASE_API_KEY,
            docPath,
            { bill: toFirestoreValue(updatedBill) },
            ["bill"]
          );

          return {
            success: true,
            message: `Payment confirmed for ${userId} in ${collName}: ${amount} VND`,
          };
        }
      }
    } catch (e: any) {
      console.error(`Error searching ${collName}:`, e.message);
      continue;
    }
  }

  return { success: false, message: `No matching payment code found: ${paymentCode}` };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only accept POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === "/health") {
        return new Response(
          JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Main webhook endpoint
      if (url.pathname !== "/sepay" && url.pathname !== "/webhook") {
        return new Response("Not found", { status: 404 });
      }

      // Optional: Verify webhook secret
      if (env.SEPAY_WEBHOOK_SECRET) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader !== `Apikey ${env.SEPAY_WEBHOOK_SECRET}`) {
          console.error("Webhook auth failed");
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Parse the SePay payload
      const payload: SepayPayload = await request.json();

      console.log("[SePay Webhook] Received:", JSON.stringify({
        id: payload.id,
        gateway: payload.gateway,
        transferType: payload.transferType,
        transferAmount: payload.transferAmount,
        code: payload.code,
        content: payload.content,
        accountNumber: payload.accountNumber,
      }));

      // Only process incoming transfers
      if (payload.transferType !== "in") {
        console.log("[SePay Webhook] Skipping outgoing transfer");
        return new Response(
          JSON.stringify({ success: true, message: "Skipped outgoing transfer" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify bank account
      if (payload.accountNumber !== env.BANK_ACCOUNT_NUMBER) {
        console.log("[SePay Webhook] Account number mismatch");
        return new Response(
          JSON.stringify({ success: true, message: "Account number mismatch - skipped" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract payment code
      const paymentCode = extractPaymentCode(payload);
      if (!paymentCode) {
        console.log("[SePay Webhook] No payment code found in transaction");
        return new Response(
          JSON.stringify({
            success: true,
            message: "No NHAU payment code found - skipped",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[SePay Webhook] Processing payment code: ${paymentCode}, amount: ${payload.transferAmount}`);

      // Find and update the payment
      const result = await findAndUpdatePayment(
        env,
        paymentCode,
        payload.transferAmount,
        payload.referenceCode
      );

      console.log(`[SePay Webhook] Result: ${result.message}`);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("[SePay Webhook] Error:", error.message);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
