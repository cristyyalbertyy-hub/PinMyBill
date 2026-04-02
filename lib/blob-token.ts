/**
 * Token read/write do Vercel Blob. Aceita o nome standard ou BLOB1_ (quando
 * se criou um segundo store e a variável ficou com outro nome no dashboard).
 * Se as duas existirem, BLOB1_ ganha (caso comum: token antigo em BLOB_ e novo em BLOB1_).
 */
export function getBlobReadWriteToken(): string | undefined {
  const standard = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const blob1 = process.env.BLOB1_READ_WRITE_TOKEN?.trim();
  return blob1 || standard || undefined;
}
