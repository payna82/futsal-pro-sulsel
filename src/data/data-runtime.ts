export type RuntimeDataSource = "supabase" | "in-memory";

function getEnvValue(...keys: string[]): string | undefined {
  if (typeof import.meta !== "undefined") {
    const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
    for (const key of keys) {
      const value = metaEnv?.[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }

  if (typeof process !== "undefined") {
    for (const key of keys) {
      const value = process.env?.[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }

  return undefined;
}

export function getRuntimeDataSource(): RuntimeDataSource {
  const rawValue = getEnvValue("VITE_ENABLE_DEMO_DATA", "ENABLE_DEMO_DATA");
  if (!rawValue) return "supabase";

  const normalized = rawValue.trim().toLowerCase();
  const enabledValues = new Set(["1", "true", "yes", "on", "demo", "in-memory"]);
  return enabledValues.has(normalized) ? "in-memory" : "supabase";
}

export function isInMemoryDataSourceEnabled(): boolean {
  return getRuntimeDataSource() === "in-memory";
}
