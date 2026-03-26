import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ficheiro nao enviado." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extension = path.extname(file.name) || ".jpg";
    const fileName = `receipt-${Date.now()}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "receipts");
    const filePath = path.join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/receipts/${fileName}` });
  } catch {
    return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
  }
}
