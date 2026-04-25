import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a product catalogue extractor. The user will share a menu, price list, catalogue, or spreadsheet.
Extract every product/service you can find and return them as a JSON array.

Rules:
- Extract ALL items you can see — don't skip anything
- If price has ₹ or Rs or INR, store the number only (e.g. 299)
- If there's a sale/offer/MRP vs selling price, use the lower price as price and higher as originalPrice
- If no price found, set price to 0
- Keep names short and clean
- Description should be 1 sentence max, only if clearly mentioned
- inStock: always true unless explicitly marked as "not available" or "sold out"

Return ONLY a valid JSON array, no explanation:
[
  { "name": "...", "description": "...", "price": 0, "discountPrice": null, "inStock": true },
  ...
]`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const fileName = file.name.toLowerCase();
  const mimeType = file.type;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let messageContent: Anthropic.MessageParam["content"];

  // ── CSV / Excel ─────────────────────────────────────────────────────────────
  if (fileName.endsWith(".csv") || mimeType === "text/csv") {
    const text = buffer.toString("utf-8");
    messageContent = `Here is a CSV price list. Extract all products:\n\n${text.slice(0, 8000)}`;

  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    // Dynamic import to avoid bundling xlsx everywhere
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    messageContent = `Here is a spreadsheet converted to CSV. Extract all products:\n\n${csv.slice(0, 8000)}`;

  // ── PDF ──────────────────────────────────────────────────────────────────────
  } else if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
    const base64 = buffer.toString("base64");
    messageContent = [
      {
        type: "document" as const,
        source: {
          type: "base64" as const,
          media_type: "application/pdf" as const,
          data: base64,
        },
      },
      { type: "text" as const, text: "Extract all products/services from this menu or catalogue." },
    ];

  // ── Image ────────────────────────────────────────────────────────────────────
  } else if (mimeType.startsWith("image/")) {
    const base64 = buffer.toString("base64");
    const imageMediaType = mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    messageContent = [
      {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: imageMediaType,
          data: base64,
        },
      },
      { type: "text" as const, text: "Extract all products/services from this menu or price list." },
    ];

  } else {
    return NextResponse.json({ error: "Unsupported file type. Please upload an image, PDF, CSV, or Excel file." }, { status: 400 });
  }

  // ── Call Claude ──────────────────────────────────────────────────────────────
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: messageContent }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";

  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Could not extract products from file. Please try a clearer image or a CSV." }, { status: 422 });
  }

  const products = JSON.parse(jsonMatch[0]);
  return NextResponse.json({ products });
}
