import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getBlobReadWriteToken } from "@/lib/blob-token";
import { requireUserId } from "@/lib/require-user";

export async function POST(request: Request): Promise<Response> {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  const token = getBlobReadWriteToken();

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Token Blob em falta (define BLOB_READ_WRITE_TOKEN ou BLOB1_READ_WRITE_TOKEN no projeto Vercel).",
      },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("receipts/")) {
          throw new Error("Caminho de upload invalido.");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar token de upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
