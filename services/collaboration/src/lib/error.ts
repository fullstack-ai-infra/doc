export function errorMessage(error: unknown, fallback = 'error'): string {
  return error instanceof Error && error.message ? error.message : fallback
}
