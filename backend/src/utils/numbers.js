export function normalizeDecimalInput(value) {
  if (value == null || value === '') return null;
  const str = String(value).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(str)) return null;
  return str;
}

export function parseDecimal(value) {
  const normalized = normalizeDecimalInput(value);
  if (normalized == null) return null;
  return Number(normalized);
}
