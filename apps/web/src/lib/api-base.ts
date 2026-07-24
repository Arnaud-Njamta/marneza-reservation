/**
 * URL de base API — proxy same-origin dans le navigateur, absolue en SSR.
 */
export function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}
