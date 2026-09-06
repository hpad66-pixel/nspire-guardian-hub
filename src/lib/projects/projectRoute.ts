export function projectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([0-9a-fA-F-]{36})(?:\/|$)/);
  return match?.[1] ?? null;
}
