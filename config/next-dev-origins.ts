const normalizeDevOrigin = (entry: string): string => {
  const value = entry.trim();
  if (value.startsWith("*.") || value.startsWith("**.")) return value;

  try {
    return new URL(value.includes("://") ? value : `http://${value}`).hostname;
  } catch {
    throw new Error(`NEXT_ALLOWED_DEV_ORIGINS contains an invalid origin: ${value}`);
  }
};

export function allowedDevOriginsFromEnvironment(
  value = process.env.NEXT_ALLOWED_DEV_ORIGINS,
): string[] | undefined {
  if (!value?.trim()) return undefined;

  const origins = [...new Set(
    value
      .split(",")
      .map(normalizeDevOrigin)
      .filter(Boolean),
  )];

  return origins.length > 0 ? origins : undefined;
}
