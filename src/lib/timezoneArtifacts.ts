import { config } from '@/lib/env';
import {
  formatInResolvedTimezone,
  getResolvedDayRange,
  getResolvedWeekRange,
  resolveTimezone,
  toLocalTime,
  type DateInput,
  type ResolveOptions,
  type TimezoneContext,
  type TimezoneResolution,
} from '@/utils/timezone';

export type TimezoneArtifacts = {
  context: TimezoneContext;
  resolution: TimezoneResolution;
};

export function buildTimezoneArtifacts(
  overrides: Partial<TimezoneContext> = {},
  options?: ResolveOptions,
): TimezoneArtifacts {
  const context = config.timezone.buildResolverContext(overrides);
  const resolution = resolveTimezone(context, options);

  return { context, resolution };
}

export function getCurrentLocalTime(
  artifacts: TimezoneArtifacts,
  reference?: DateInput,
): Date {
  return toLocalTime(reference ?? new Date(), artifacts.context);
}

export function formatLocalDate(
  artifacts: TimezoneArtifacts,
  date: DateInput,
  formatStr = 'yyyy-MM-dd',
): string {
  return formatInResolvedTimezone(date, formatStr, artifacts.context);
}

export function getLocalDayRange(
  artifacts: TimezoneArtifacts,
  date: DateInput,
) {
  return getResolvedDayRange(date, artifacts.context);
}

export function getLocalWeekRange(
  artifacts: TimezoneArtifacts,
  date: DateInput,
) {
  return getResolvedWeekRange(date, artifacts.context);
}

export function toLocalDate(
  artifacts: TimezoneArtifacts,
  value: DateInput,
): Date {
  return toLocalTime(value, artifacts.context);
}
