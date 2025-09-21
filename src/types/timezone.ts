export type {
  ResolveOptions,
  TimezoneContext,
  TimezoneResolution,
  TimezoneSource,
} from '@/utils/timezone';

export interface TimezoneResolverConfigSummary {
  envFallbacks: string[];
  legacyTimezone: string;
}
