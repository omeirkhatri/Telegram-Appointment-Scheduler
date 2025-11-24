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
