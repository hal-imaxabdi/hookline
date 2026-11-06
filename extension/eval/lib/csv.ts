/**
 * Minimal RFC-4180 CSV parser: quoted fields, escaped quotes (""), CR/LF/CRLF
 * line endings, and newlines inside quoted fields (needed for EMSCAD job
 * postings). Streams rows to a callback so large files don't need every
 * column held in memory.
 */

export function parseCsv(text: string, onRow: (fields: string[], rowIndex: number) => void): number {
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1; // BOM
  const n = text.length;
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let rowIndex = 0;

  const endRow = () => {
    row.push(field);
    field = "";
    if (!(row.length === 1 && row[0] === "")) onRow(row, rowIndex++);
    row = [];
  };

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { endRow(); i += text[i + 1] === "\n" ? 2 : 1; continue; }
    if (c === "\n") { endRow(); i++; continue; }
    field += c; i++;
  }
  if (field !== "" || row.length > 0) endRow();
  return rowIndex;
}

export function csvEscape(v: string | number | boolean): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
