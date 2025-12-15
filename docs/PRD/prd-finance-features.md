# PRD: Finance & Payment Tracking System

## Overview
This PRD outlines the implementation of a finance and payment tracking system. It introduces "Service Contracts" for recurring and session-based services, tracks client payments, and calculates staff payouts for outsourced staff.

## Goals
1. **Track Service Contracts**: Manage recurring (Monthly) and session-based (Pack of 10) services.
2. **Client Payments**: Track amounts paid, methods, and outstanding balances.
3. **Staff Payouts**: Calculate "Days Worked" for outsourced staff and record payouts.
4. **Financial Visibility**: Dashboard for Active Contracts, Renewals, and Staff Payments.

## Functional Requirements

### 1. Service Contracts
*   **Contract Types**:
    *   **Monthly/Recurring**: Fixed Start/End Date (e.g., Caregiver for Jan).
    *   **Session Pack**: Fixed number of sessions (e.g., 10 Physio Sessions).
*   **Core Data**:
    *   Patient Link
    *   Service Type (Caregiver, Nurse, Physio, etc.)
    *   Dates (Start, End)
    *   Financials (Total Cost, Currency [AED default])
    *   Staff Pay Rate (Daily/Session rate for this specific contract)
    *   Status: Draft, Active, Completed, Terminated
*   **Logic**:
    *   **Renewals**: "One-Click Renew" clones the contract to a new draft with next month's dates.
    *   **Appointment Linking**: Appointments are linked to a `service_contract_id`.

### 2. Client Payments (Inflow)
*   **Payment Recording**: Log individual payments against a contract.
*   **Fields**: Amount, Date, Method (Cash, Card, Transfer, Cheque), Reference, Notes.
*   **Receipts**: Generate simple PDF receipt for each payment.
*   **Calculations**: `Balance = Contract Total - Sum(Payments)`.
*   **Partial Payments**: Allowed.

### 3. Staff Payouts (Outflow - Outsourced)
*   **Scope**: Primarily for "Outsourced" staff (paid per day/session).
*   **Rate Definition**: Defined *per contract* (e.g., "For this Patient, Staff A gets 150/day").
*   **Work Tracking**: Automatically calculated from *Completed* Appointments linked to the contract.
*   **Payout Recording**: Admin logs a payout to the staff member (Amount, Date).
*   **Calculations**:
    *   `Total Earned = (Completed Days/Sessions * Rate)`
    *   `Pending Pay = Total Earned - Total Paid Out`

### 4. Cancellations & Credits
*   **Session Packs**: Cancelled appointments do not count as "Used". Balance remains available.
*   **Monthly**: Cancelled days might extend the end date or be refunded (Manual adjustment of "Total Cost" if needed).

## Data Model (New Tables)

### `service_contracts`
*   `id` (UUID, PK)
*   `patient_id` (FK)
*   `contract_type` (Enum: 'monthly', 'session_pack')
*   `service_type` (Enum: 'caregiver', 'physio', etc.)
*   `start_date` (Date)
*   `end_date` (Date, nullable for open-ended)
*   `total_sessions` (Int, for packs)
*   `total_amount` (Decimal)
*   `status` (Enum: 'draft', 'active', 'completed', 'terminated')
*   `staff_payment_rate` (Decimal, optional - rate per unit)
*   `notes` (Text)
*   `created_at` (Timestamp)
*   `updated_at` (Timestamp)

### `contract_payments`
*   `id` (UUID, PK)
*   `contract_id` (FK)
*   `amount` (Decimal)
*   `payment_date` (Date)
*   `method` (Enum)
*   `reference` (Text)
*   `receipt_number` (Text, Auto-generated)
*   `notes` (Text)
*   `created_at` (Timestamp)
*   `updated_at` (Timestamp)

### `staff_payouts`
*   `id` (UUID, PK)
*   `staff_id` (FK)
*   `amount` (Decimal)
*   `payout_date` (Date)
*   `notes` (Text)
*   `related_contract_id` (FK, Optional - if pay is specific to a job)
*   `created_at` (Timestamp)
*   `updated_at` (Timestamp)

### `appointments` (Update)
*   `service_contract_id` (FK)

## UI/UX Requirements

### 1. Finance Dashboard (Admin Only)
*   **Active Contracts**: List of active patients/contracts.
*   **Columns**: Patient, Service, Dates, Total, Paid, Balance (Color-coded: Red if overdue).
*   **Actions**: Add Payment, Renew, View Details.

### 2. Staff Payout View
*   **List**: Outsourced Staff members.
*   **Stats**: Total Worked Days (This Month), Total Earned, Paid, Pending.
*   **Actions**: "Record Payout".

### 3. Contract Details Page
*   Summary of Financials.
*   List of Client Payments (History).
*   List of Linked Appointments (Attendance).
*   "Renew" and "Edit" buttons.

## Security
*   Access restricted to `admin` and `manager` roles.
*   Staff (Outsourced) can optionally view their own "Earnings" page (Future scope).

## Relevant Files
*   `supabase/migrations/` (New migration files)
*   `src/types/finance.ts` (New types)
*   `src/app/finance/` (New routes)
*   `src/services/financeService.ts` (New service)

## Progress Notes
- **2025-11-24 – Task 1.1**: Reviewed and updated `supabase/migrations/20250225000000_finance_schema.sql` so `contract_payments` and `staff_payouts` now track `updated_at` with triggers shared across finance tables. Tests: not run (Supabase CLI/database access not configured locally). Pending: rerun migration in the target Supabase project once credentials are available.
- **2025-11-24 – Task 1.2**: Added `src/types/finance.ts` with strongly typed enums and interfaces for `ServiceContract`, `ContractPayment`, and `StaffPayout`, plus re-export in `src/types/index.ts` for app-wide access. Tests: not run (type-only change). Pending: hook types into service implementations once backend work begins.
- **2025-11-24 – Task 1.3**: Expanded appointment types to expose `service_contract_id` (including create/update/form shapes) so UI and API calls can link visits to contracts. Tests: not run (type-only change). Pending: ensure UI forms surface the new field during contract linking work.
- **2025-11-24 – Task 1.4**: Tightened RLS in `supabase/migrations/20250225000000_finance_schema.sql` so `service_contracts`, `contract_payments`, and `staff_payouts` permit read/write only when `user_profiles.role` is `admin` or `manager`. Tests: not run (no Supabase environment hooked up). Pending: reapply migration in staging to confirm policy enforcement.
- **2025-11-24 – Task 1.5**: Manually synced `src/types/supabase.ts` with the finance schema (new enums, tables, and appointment contract link) since Supabase CLI access isn’t configured locally. Tests: not run (type-only change). Pending: rerun `supabase gen types typescript` in CI once credentials are available to double-check.
- **2025-11-26 – Task 2.1**: Introduced `src/services/financeService.ts` with typed method stubs, centralized logging, and defensive error handling so future backend work plugs into a consistent surface area. Tests: not run (scaffold only, no logic yet).
- **2025-11-26 – Task 2.2**: Implemented Supabase-backed contract CRUD in `financeService` (`createContract`, `updateContract`, `getContract`, `listContracts`) including status/patient/search filters, pagination helpers, and non-terminated defaults unless explicitly requested. Tests: not run (service-only change). Pending: wire these methods into UI/API flows once endpoints are ready.
- **2025-11-26 – Task 2.3**: Added payment tracking operations in `financeService` so we can persist payments (`recordPayment`), query contract histories (`getPaymentsByContract`), and surface real balances via `calculateContractBalance`. Tests: not run (service-only change, Supabase access unavailable). Pending: consume these helpers in dashboard/payout summaries once APIs exist.
- **2025-11-26 – Task 2.4**: Delivered staff payout helpers in `financeService` (`recordPayout`, `getPayoutsByStaff`, `calculateStaffEarnings`) with date filtering and current data scaffolding; earnings calculation is a placeholder until appointment revenue logic lands. Tests: not run (service-only change). Pending: integrate with payout UI and enhance earnings computation once appointments → payouts reconciliation is built.
- **2025-11-26 – Task 2.5**: Enabled appointment ↔ contract utilities in `financeService` by wiring `linkAppointmentToContract` (FK-safe update) and `getAppointmentsByContract` with optional staff/attendance selects plus patient address normalization. Tests: not run (service-only change). Pending: plug into Contract Details UI and extend attendance metrics once segments data is ready.
- **2025-11-26 – Task 2.6**: Added `src/services/__tests__/financeService.test.ts` covering balance math, payout aggregation placeholders, appointment normalization, and FK linking errors using the shared Supabase mocks. Tests: attempted `npx jest src/services/__tests__/financeService.test.ts` but Jest currently ignores `src/services/__tests__` paths in this branch (reports “No tests found, Pattern: ... - 0 matches”). Pending: update Jest config or relocate tests so CI picks them up; for now the suite exists but isn’t executed automatically.
- **2025-11-26 – Task 3.1**: Created `src/app/finance/layout.tsx` with a dedicated finance workspace shell (sidebar navigation, quick actions, summary placeholders, and top tabs for Contracts/Payments/Payouts). Tests: not run (layout-only styling change). Pending: wire layout to real data once finance dashboard pages land.
- **2025-11-26 – Task 3.2**: Implemented `src/app/finance/page.tsx` as a client component that fetches active contracts via `financeService.listContracts`, calculates balances per contract, and displays summary cards (active count, outstanding balance, overdue count) plus a scrollable list of contract cards with key details and color-coded overdue indicators. Tests: not run (UI-only change, requires Supabase connection). Pending: add API route layer if direct service calls prove unreliable in browser context; enhance empty state with actionable CTAs.
