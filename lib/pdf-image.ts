/** Comprime imagem para inclusão em PDF (email-friendly). */
export async function compressImageForPdf(
  dataUrl: string,
  options: { maxWidth?: number; quality?: number } = {},
): Promise<{ dataUrl: string; width: number; height: number }> {
  const maxWidth = options.maxWidth ?? 1200;
  const quality = options.quality ?? 0.72;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", quality),
        width,
        height,
      });
    };
    img.onerror = () => reject(new Error("image load"));
    img.src = dataUrl;
  });
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Limite típico de anexos por email (Gmail/Outlook). */
export const EMAIL_ATTACHMENT_LIMIT_BYTES = 25 * 1024 * 1024;
