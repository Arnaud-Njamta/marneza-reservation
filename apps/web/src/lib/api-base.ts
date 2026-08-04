/**
 * URL de base API — build statique (FileZilla) : toujours l’URL absolue.
 */
export function resolveApiBase(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:4000';
}
