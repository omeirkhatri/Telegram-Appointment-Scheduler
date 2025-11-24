## Relevant Files

- `supabase/migrations/20250225000000_finance_schema.sql` - Database migration for finance tables.
- `src/types/finance.ts` - TypeScript definitions for contracts, payments, and payouts.
- `src/services/financeService.ts` - Business logic for finance operations.
- `src/app/finance/page.tsx` - Main Finance Dashboard.
- `src/app/finance/contracts/[id]/page.tsx` - Contract details and management.
- `src/app/finance/payouts/page.tsx` - Staff payout management.
- `src/components/features/appointments/AppointmentForm.tsx` - Updated to support contract linking.

### Notes

- Use Supabase `rpc` calls if complex aggregation is needed for the dashboard.
- Ensure `appointmentService` and `financeService` are loosely coupled where possible.

## Tasks

- [ ] 1.0 Database & Types
  - [ ] 1.1 Create `src/types/finance.ts` with interfaces for `ServiceContract`, `ContractPayment`, `StaffPayout`.
  - [ ] 1.2 Update `src/types/appointment.ts` to include `service_contract_id`.
  - [ ] 1.3 Create migration file `supabase/migrations/20250225000000_finance_schema.sql` for `service_contracts`, `contract_payments`, `staff_payouts`, and alter `appointments`.
  - [ ] 1.4 Apply migration and verify schema.

- [ ] 2.0 Backend Services
  - [ ] 2.1 Create `src/services/financeService.ts` with methods for Contracts (CRUD).
  - [ ] 2.2 Add methods to `financeService.ts` for Payments (Inflow) and Payouts (Outflow).
  - [ ] 2.3 Implement balance calculation logic in `financeService.ts`.
  - [ ] 2.4 Update `src/services/appointmentService.ts` to handle `service_contract_id` during creation/updates.

- [ ] 3.0 Finance Dashboard & Contracts UI
  - [ ] 3.1 Create `src/app/finance/layout.tsx` and `src/app/finance/page.tsx` (Dashboard view).
  - [ ] 3.2 Implement `ActiveContractsTable` component for the dashboard.
  - [ ] 3.3 Create `src/app/finance/contracts/new/page.tsx` and `ContractForm` component.
  - [ ] 3.4 Create `src/app/finance/contracts/[id]/page.tsx` for contract details.
  - [ ] 3.5 Implement `PaymentModal` for recording client payments.

- [ ] 4.0 Staff Payouts UI
  - [ ] 4.1 Create `src/app/finance/payouts/page.tsx` for Outsourced Staff view.
  - [ ] 4.2 Implement logic to calculate "Days Worked" and "Pending Pay" based on completed appointments.
  - [ ] 4.3 Implement `RecordPayoutModal` to log staff payments.

- [ ] 5.0 Integration
  - [ ] 5.1 Update `src/components/features/appointments/AppointmentForm.tsx` to allow selecting/linking a Service Contract.
  - [ ] 5.2 Implement "One-Click Renew" logic in Contract Details.

- [ ] 6.0 Testing & Finalization
  - [ ] 6.1 Verify full flow: Create Contract -> Link Appointment -> Complete Appt -> Check Staff Pending Pay.
  - [ ] 6.2 Verify Client Payment recording and Balance update.
  - [ ] 6.3 Check "Session Pack" logic (remaining sessions count).
