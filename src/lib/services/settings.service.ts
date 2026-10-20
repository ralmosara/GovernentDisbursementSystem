import { db } from '../db/connection';
import { systemSettings } from '../db/schema';
import { inArray } from 'drizzle-orm';
import { logUpdate } from '../middleware/audit-logger';

/**
 * System settings stored as key/value rows in `system_settings`.
 *
 * Every editable setting is declared here with its group, type and default, so the
 * API can only write known keys and readers always get a typed value even when the
 * row does not exist yet.
 */

type SettingType = 'string' | 'number' | 'boolean';

interface SettingDefinition {
  group: SettingGroup;
  type: SettingType;
  default: string | number | boolean;
  description: string;
  min?: number;
  max?: number;
  maxLength?: number;
}

export type SettingGroup = 'general' | 'security';

export const SETTING_DEFINITIONS = {
  // General / agency
  agency_name: { group: 'general', type: 'string', default: 'Government Agency', description: 'Agency name', maxLength: 255 },
  agency_code: { group: 'general', type: 'string', default: '', description: 'Agency code', maxLength: 50 },
  agency_address: { group: 'general', type: 'string', default: '', description: 'Agency address', maxLength: 500 },
  contact_email: { group: 'general', type: 'string', default: '', description: 'Agency contact email', maxLength: 255 },
  contact_phone: { group: 'general', type: 'string', default: '', description: 'Agency contact phone', maxLength: 50 },
  current_fiscal_year: { group: 'general', type: 'number', default: new Date().getFullYear(), description: 'Current fiscal year', min: 2000, max: 2100 },

  // Security
  password_min_length: { group: 'security', type: 'number', default: 8, description: 'Minimum password length', min: 8, max: 64 },
  password_require_uppercase: { group: 'security', type: 'boolean', default: true, description: 'Passwords require an uppercase letter' },
  password_require_lowercase: { group: 'security', type: 'boolean', default: true, description: 'Passwords require a lowercase letter' },
  password_require_number: { group: 'security', type: 'boolean', default: true, description: 'Passwords require a number' },
  password_require_special: { group: 'security', type: 'boolean', default: false, description: 'Passwords require a special character' },
  enforce_segregation_of_duties: {
    group: 'security',
    type: 'boolean',
    default: true,
    description: 'DV creators cannot approve their own vouchers and one person cannot approve two stages of the same voucher',
  },
} satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;
type SettingValue<K extends SettingKey> = (typeof SETTING_DEFINITIONS)[K]['default'] extends boolean
  ? boolean
  : (typeof SETTING_DEFINITIONS)[K]['default'] extends number
    ? number
    : string;

const CACHE_TTL_MS = 30_000;
let cache: { values: Map<string, string | null>; loadedAt: number } | null = null;

function parseValue(def: SettingDefinition, raw: string | null | undefined) {
  if (raw === null || raw === undefined) return def.default;
  switch (def.type) {
    case 'boolean':
      return raw === 'true' || raw === '1';
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : def.default;
    }
    default:
      return raw;
  }
}

async function loadAll(): Promise<Map<string, string | null>> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.values;
  }

  const keys = Object.keys(SETTING_DEFINITIONS);
  const rows = await db
    .select({ key: systemSettings.settingKey, value: systemSettings.settingValue })
    .from(systemSettings)
    .where(inArray(systemSettings.settingKey, keys));

  const values = new Map(rows.map(r => [r.key, r.value]));
  cache = { values, loadedAt: Date.now() };
  return values;
}

/**
 * Read one typed setting (falls back to its default)
 */
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const values = await loadAll();
  return parseValue(SETTING_DEFINITIONS[key], values.get(key)) as SettingValue<K>;
}

/**
 * Read every setting in a group as a typed object
 */
export async function getSettingsGroup(group: SettingGroup): Promise<Record<string, string | number | boolean>> {
  const values = await loadAll();
  const result: Record<string, string | number | boolean> = {};

  for (const [key, def] of Object.entries(SETTING_DEFINITIONS) as [string, SettingDefinition][]) {
    if (def.group === group) {
      result[key] = parseValue(def, values.get(key));
    }
  }

  return result;
}

/**
 * Validate and persist settings for one group. Unknown keys and keys from other
 * groups are rejected. Returns field errors instead of throwing for bad input.
 */
export async function updateSettingsGroup(
  group: SettingGroup,
  input: Record<string, unknown>,
  userId: number
): Promise<{ success: true } | { success: false; errors: Record<string, string> }> {
  const errors: Record<string, string> = {};
  const updates: { key: string; value: string; def: SettingDefinition }[] = [];

  for (const [key, rawValue] of Object.entries(input)) {
    const def = (SETTING_DEFINITIONS as Record<string, SettingDefinition>)[key];

    if (!def || def.group !== group) {
      errors[key] = 'Unknown setting';
      continue;
    }

    if (def.type === 'boolean') {
      if (typeof rawValue !== 'boolean') {
        errors[key] = 'Must be true or false';
        continue;
      }
      updates.push({ key, value: String(rawValue), def });
    } else if (def.type === 'number') {
      const n = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!Number.isInteger(n)) {
        errors[key] = 'Must be a whole number';
      } else if ((def.min !== undefined && n < def.min) || (def.max !== undefined && n > def.max)) {
        errors[key] = `Must be between ${def.min} and ${def.max}`;
      } else {
        updates.push({ key, value: String(n), def });
      }
    } else {
      const s = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (def.maxLength && s.length > def.maxLength) {
        errors[key] = `Must be at most ${def.maxLength} characters`;
      } else if (key === 'contact_email' && s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        errors[key] = 'Must be a valid email address';
      } else {
        updates.push({ key, value: s, def });
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const before = await getSettingsGroup(group);

  for (const { key, value, def } of updates) {
    await db
      .insert(systemSettings)
      .values({
        settingKey: key,
        settingValue: value,
        settingType: def.type,
        description: def.description,
        isEditable: true,
        updatedBy: userId,
      })
      .onDuplicateKeyUpdate({ set: { settingValue: value, updatedBy: userId } });
  }

  cache = null;

  await logUpdate(
    'system_settings',
    0,
    before,
    Object.fromEntries(updates.map(u => [u.key, u.value])),
    userId
  );

  return { success: true };
}

/**
 * Check a password against the configured policy. Returns a list of unmet rules.
 */
export async function validatePasswordPolicy(password: string): Promise<string[]> {
  const policy = await getSettingsGroup('security');
  const problems: string[] = [];

  const minLength = Number(policy.password_min_length);
  if (password.length < minLength) problems.push(`at least ${minLength} characters`);
  if (policy.password_require_uppercase && !/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (policy.password_require_lowercase && !/[a-z]/.test(password)) problems.push('a lowercase letter');
  if (policy.password_require_number && !/[0-9]/.test(password)) problems.push('a number');
  if (policy.password_require_special && !/[^A-Za-z0-9]/.test(password)) problems.push('a special character');

  return problems;
}

/** For tests: drop the in-memory cache */
export function clearSettingsCache() {
  cache = null;
}
