# PinMyBill

MVP inicial para gerir recibos pessoais e de empresa de forma rapida:

- upload de recibos (proximo passo: camera + OCR),
- classificacao entre `pessoal` e `empresa`,
- organizacao por subcategorias,
- exportacao PDF (estrutura inicial pronta).

## Estado atual (v0 - base de produto)

- `app/page.tsx`: dashboard com resumo e fluxo da app.
- `app/despesas/page.tsx`: tabela de despesas.
- `app/categorias/page.tsx`: adicionar, apagar e renomear categorias.
- `app/exportar/page.tsx`: exportar por empresa, pessoal ou cliente, com remocao de linhas.
- `lib/mock-data.ts`: dados mock para navegacao inicial.

## Como correr localmente (PowerShell no Windows)

Se `node`/`npm` nao estiverem no PATH, usa:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Depois abre [http://localhost:3000](http://localhost:3000).

## Proximos passos sugeridos

1. Prisma + Neon (modelos `User`, `Expense`, `Category`, `ReceiptImage`).
2. Upload real de imagem (Vercel Blob).
3. OCR/IA para extrair dados do recibo.
4. Regras de classificacao pessoal vs empresa.
5. Exportacao PDF com fotos anexadas.
