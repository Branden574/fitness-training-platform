import 'server-only';

import { prisma } from './prisma';

// Defaults used when the DB row is missing (e.g., before the phase-8 migration
// has been applied in a given environment).
const DEFAULTS: Record<string, boolean> = {
  active_workout_v4: true,
  client_messages_sse: true,
  food_search_usda: true,
  food_search_off: true,
  barcode_scanner: true,
  program_builder: true,
  stripe_subscriptions: false,
  pr_detection: true,
};

export async function isFlagEnabled(key: string): Promise<boolean> {
  try {
    const row = await prisma.featureFlag.findUnique({
      where: { key },
      select: { enabled: true },
    });
    if (row) return row.enabled;
  } catch {
    // Table may not exist yet — fall through to defaults
  }
  return DEFAULTS[key] ?? false;
}

export async function getAllFlags(): Promise<
  Array<{ key: string; enabled: boolean; description: string | null; updatedAt: Date | null; updatedBy: string | null }>
> {
  try {
    const rows = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    if (rows.length > 0) return rows;
  } catch {
    // Table may not exist yet
  }
  // Fallback: return defaults
  return Object.entries(DEFAULTS).map(([key, enabled]) => ({
    key,
    enabled,
    description: null,
    updatedAt: null,
    updatedBy: null,
  }));
}
