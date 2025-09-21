# Reporting & Export Timezone Audit (Task 5.1)

Date: 2025-09-20
Author: Codex (AI assistant)

## Scope

Task 5.1 requires cataloguing all reports, exports, print workflows, and analytics dashboards that still use hardcoded Dubai timezone defaults instead of the new timezone resolver system.

## Findings

### 1. Print Utilities (`src/lib/printUtils.ts`)

**Status**: ❌ Uses hardcoded Dubai timezone

**Issues**:
- `PRINT_TIMEZONE = 'Asia/Dubai'` constant (line 9)
- `formatPrintDate()` uses `formatInTimeZone(dateObj, PRINT_TIMEZONE, PRINT_DATE_FORMAT)` (line 18)
- All print formatting functions assume Dubai timezone

**Impact**: Print agendas, appointment sheets, and all print workflows display dates in Dubai time regardless of actual location

### 2. Print Pages

#### 2.1 Agenda Print Page (`src/app/print/agenda/[staffId]/[date]/page.tsx`)

**Status**: ❌ Uses hardcoded Dubai timezone

**Issues**:
- `generateMetadata()` uses `formatInTimeZone(agendaDate, 'Asia/Dubai', 'dd/MM/yyyy')` (line 102)
- Page metadata shows Dubai-formatted dates regardless of staff location

#### 2.2 Appointment Print Page (`src/app/print/appointment/[id]/page.tsx`)

**Status**: ❌ Uses hardcoded Dubai timezone

**Issues**:
- `generateMetadata()` uses `formatInTimeZone(appointmentDate, 'Asia/Dubai', 'dd/MM/yyyy')` (line 74)
- Page metadata shows Dubai-formatted dates regardless of appointment location

### 3. CSV Export System (`src/app/api/reports/export/route.ts`)

**Status**: ❌ No timezone context, uses raw database values

**Issues**:
- All report generators (`generateAppointmentsReport`, `generatePatientsReport`, etc.) use raw database timestamps
- No timezone resolution or local time formatting
- Date/time fields exported as stored (likely UTC) without conversion
- No timezone metadata in export headers

**Impact**: CSV exports show UTC timestamps instead of local times, making them difficult to interpret

### 4. Analytics Dashboard (`src/app/api/reports/statistics/route.ts`)

**Status**: ❌ No timezone context

**Issues**:
- Statistics calculations use raw database timestamps
- Date range filtering uses UTC boundaries
- No timezone-aware date grouping or aggregation
- Generated timestamps in metadata use `new Date().toISOString()` (UTC)

### 5. Reports Dashboard UI (`src/components/reports/ReportsDashboard.tsx`)

**Status**: ❌ No timezone context

**Issues**:
- Date range picker uses browser local time
- No timezone display or context information
- Statistics display assumes browser timezone

### 6. Charts Section (`src/components/reports/ChartsSection.tsx`)

**Status**: ❌ No timezone context

**Issues**:
- Chart data uses raw timestamps
- No timezone-aware grouping or labeling
- Date axes show UTC or browser timezone

## Summary

| Component | Timezone Usage | Priority | Impact |
|-----------|----------------|----------|---------|
| `printUtils.ts` | Hardcoded `Asia/Dubai` | High | All print workflows |
| Print pages metadata | Hardcoded `Asia/Dubai` | High | SEO and page titles |
| CSV exports | No timezone context | High | Data interpretation |
| Analytics API | No timezone context | Medium | Dashboard accuracy |
| Reports UI | No timezone context | Medium | User experience |
| Charts | No timezone context | Low | Visual accuracy |

## Recommendations

1. **High Priority**: Update `printUtils.ts` to accept timezone context and use resolver
2. **High Priority**: Add timezone metadata to CSV exports with local time columns
3. **Medium Priority**: Update analytics APIs to use timezone-aware date grouping
4. **Medium Priority**: Add timezone context to reports dashboard UI
5. **Low Priority**: Update chart components to show timezone-aware labels

## Next Steps

Task 5.2 should focus on updating the high-priority components to use the timezone resolver system and provide timezone metadata in all outputs.
