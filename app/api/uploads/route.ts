import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getBlobReadWriteToken } from "@/lib/blob-token";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ficheiro nao enviado." }, { status: 400 });
    }

    const extension = path.extname(file.name) || ".jpg";
    const fileName = `receipt-${Date.now()}${extension}`;
    const blobToken = getBlobReadWriteToken();
    const hasBlobToken = Boolean(blobToken);

    if (hasBlobToken) {
      const blob = await put(`receipts/${fileName}`, file, {
        access: "public",
        token: blobToken,
        contentType: file.type || undefined,
      });
      return NextResponse.json({ url: blob.url });
    }

    // Fallback local apenas para desenvolvimento.
    if (process.env.NODE_ENV !== "production") {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = path.join(process.cwd(), "public", "receipts");
      const filePath = path.join(uploadDir, fileName);
      await mkdir(uploadDir, { recursive: true });
      await writeFile(filePath, buffer);
      return NextResponse.json({ url: `/receipts/${fileName}` });
    }

    return NextResponse.json(
      {
        error:
          "Upload nao configurado na producao (falta BLOB_READ_WRITE_TOKEN ou BLOB1_READ_WRITE_TOKEN).",
      },
      { status: 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado no upload.";
    console.error("Upload falhou:", error);
    return NextResponse.json({ error: `Falha no upload: ${message}` }, { status: 500 });
  }
}
