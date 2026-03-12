export function sanitizePhone(input?: string | null) {
  return String(input ?? '').replace(/\D/g, '');
}
