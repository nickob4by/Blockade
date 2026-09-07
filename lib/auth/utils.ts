/**
 * Converts a username or identifier into a valid email address for Supabase GoTrue.
 * Supabase requires a valid public Top-Level Domain (TLD) and rejects reserved/local domains like .local.
 */
export function normalizeAuthEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  const cleanUsername = trimmed.replace(/[^a-z0-9_.-]/g, '') || 'player';
  return `${cleanUsername}@blockadegame.com`;
}
