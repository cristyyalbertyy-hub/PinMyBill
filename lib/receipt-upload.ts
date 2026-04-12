import { upload } from "@vercel/blob/client";

type UploadResponse = { url?: string; error?: string };

function sanitizeExtension(fileName: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  if (!match) return "jpg";
  return match[1].toLowerCase();
}

function buildReceiptPath(file: File): string {
  const ext = sanitizeExtension(file.name);
  return `receipts/receipt-${Date.now()}.${ext}`;
}

async function uploadViaApi(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  let result: UploadResponse | null = null;
  try {
    result = (await response.json()) as UploadResponse;
  } catch {
    // Mantém result como null se a API não devolveu JSON.
  }

  if (!response.ok || !result?.url) {
    const status = response.status ? `status=${response.status}` : "status=?";
    const detail = result?.error ? `; detalhe=${result.error}` : "";
    throw new Error(`Falha no upload via /api/uploads (${status})${detail}`);
  }
  return result.url;
}

export async function uploadReceiptImage(file: File): Promise<string> {
  const pathName = buildReceiptPath(file);

  // Em producao no Vercel, envio direto do browser para Blob
  // evita limites e escrita efemera da funcao serverless.
  if (process.env.NODE_ENV === "production") {
    try {
      const blob = await upload(pathName, file, {
        access: "public",
        handleUploadUrl: "/api/uploads/token",
      });
      return blob.url;
    } catch (directError) {
      // Fallback defensivo para manter compatibilidade em ambientes mistos.
      try {
        return uploadViaApi(file);
      } catch (apiError) {
        const dMsg = directError instanceof Error ? directError.message : "erro no upload direto";
        const aMsg = apiError instanceof Error ? apiError.message : "erro no fallback da API";
        throw new Error(`Upload falhou no Vercel Blob (${dMsg}) e no fallback (${aMsg}).`);
      }
    }
  }

  // Em desenvolvimento local continua a usar a rota existente.
  return uploadViaApi(file);
}
