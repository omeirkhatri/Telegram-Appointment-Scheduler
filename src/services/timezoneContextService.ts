import { getServiceRoleClient } from '@/lib/supabase';
import type { Location } from '@/types/supabase';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface OrganizationTimezone {
  id: string;
  displayName: string | null;
  defaultTimezone: string;
  metadata: Record<string, unknown> | null;
}

interface LocationTimezone {
  id: string;
  slug: string;
  displayName: string;
  timezone: string;
  timezoneSource: Location['timezone_source'];
  isActive: boolean;
}

const organizationCache = new Map<string, CacheEntry<OrganizationTimezone>>();
const locationCache = new Map<string, CacheEntry<LocationTimezone>>();

function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return Boolean(entry && entry.expiresAt > Date.now());
}

function setCache<T>(map: Map<string, CacheEntry<T>>, key: string, value: T): void {
  map.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export async function getOrganizationTimezone(organizationId?: string): Promise<OrganizationTimezone | null> {
  const identifier = normalizeKey(organizationId || 'primary');
  const cached = organizationCache.get(identifier);

  if (isCacheValid(cached)) {
    return cached.value;
  }

  try {
    const client = getServiceRoleClient();
    const { data, error } = await client
      .from('organization_settings')
      .select('id, display_name, default_timezone, metadata')
      .eq('id', identifier)
      .maybeSingle();

    if (error) {
      console.warn(`Failed to load organization timezone for ${identifier}:`, error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    const value: OrganizationTimezone = {
      id: data.id,
      displayName: data.display_name,
      defaultTimezone: data.default_timezone,
      metadata: data.metadata,
    };

    setCache(organizationCache, identifier, value);
    return value;
  } catch (error) {
    console.warn(`Unexpected error loading organization timezone for ${identifier}:`, error);
    return null;
  }
}

export async function getLocationTimezone(identifier: string): Promise<LocationTimezone | null> {
  const normalized = normalizeKey(identifier);
  const cached = locationCache.get(normalized);

  if (isCacheValid(cached)) {
    return cached.value;
  }

  try {
    const client = getServiceRoleClient();

    const selectColumns = 'id, slug, display_name, timezone, timezone_source, is_active';

    // Try lookup by slug first
    const { data: bySlug, error: slugError } = await client
      .from('locations')
      .select(selectColumns)
      .eq('slug', identifier.trim())
      .eq('is_active', true)
      .maybeSingle();

    let location = bySlug;
    let lookupError = slugError;

    if (!location && isUuid(identifier)) {
      const { data: byId, error: idError } = await client
        .from('locations')
        .select(selectColumns)
        .eq('id', identifier.trim())
        .eq('is_active', true)
        .maybeSingle();

      location = byId;
      lookupError = idError;
    }

    if (lookupError && lookupError.code !== 'PGRST116') {
      console.warn(`Failed to load location timezone for ${identifier}:`, lookupError.message);
      return null;
    }

    if (!location) {
      return null;
    }

    const value: LocationTimezone = {
      id: location.id,
      slug: location.slug,
      displayName: location.display_name,
      timezone: location.timezone,
      timezoneSource: location.timezone_source,
      isActive: location.is_active,
    };

    setCache(locationCache, normalized, value);
    setCache(locationCache, normalizeKey(location.slug), value);
    setCache(locationCache, normalizeKey(location.id), value);

    return value;
  } catch (error) {
    console.warn(`Unexpected error loading location timezone for ${identifier}:`, error);
    return null;
  }
}

export function clearTimezoneCaches(): void {
  organizationCache.clear();
  locationCache.clear();
}

export type { OrganizationTimezone, LocationTimezone };
