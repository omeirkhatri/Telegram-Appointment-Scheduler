# Tasks: Finance & Payment Tracking System

Based on PRD: `docs/PRD/prd-finance-features.md`

## Relevant Files

- `supabase/migrations/20250225000000_finance_schema.sql` - Database schema for finance features.
- `src/types/finance.ts` - TypeScript definitions for contracts, payments, and payouts.
- `src/services/financeService.ts` - Business logic for finance operations.
- `src/app/finance/page.tsx` - Main Finance Dashboard.
- `src/app/finance/contracts/[id]/page.tsx` - Contract Details Page.
- `src/app/finance/payouts/page.tsx` - Staff Payouts Page.
- `src/app/finance/layout.tsx` - Finance workspace shell with sidebar/tabs navigation.
- `src/components/finance/ContractForm.tsx` - Form for creating/editing contracts.
- `src/components/finance/PaymentModal.tsx` - Modal for recording client payments.
- `src/components/finance/PayoutModal.tsx` - Modal for recording staff payouts.
- `src/types/appointment.ts` - Update to include contract linking.

### Notes

- Ensure RLS policies are correctly applied as defined in the migration.
- Use `npx jest` for testing services and components.
- Access to finance routes should be restricted to `admin` and `manager` roles.

## Tasks

- [ ] 1.0 Database & Types Setup
  - [x] 1.1 Review and apply the database migration `supabase/migrations/20250225000000_finance_schema.sql`.
  - [x] 1.2 Create TypeScript definitions for `ServiceContract`, `ContractPayment`, and `StaffPayout` in `src/types/finance.ts`.
  - [x] 1.3 Update `Appointment` type in `src/types/appointment.ts` to include `service_contract_id`.
  - [x] 1.4 Verify RLS policies for the new tables to ensure proper access control (admin/manager only).
  - [x] 1.5 Run database type generation or manually ensure Supabase types and database schema are in sync.

- [ ] 2.0 Backend Services Implementation
  - [x] 2.1 Create `src/services/financeService.ts` skeleton with error handling and logging.
  - [x] 2.2 Implement contract management methods: `createContract`, `updateContract`, `getContract`, `listContracts` (with filters for status/patient).
  - [x] 2.3 Implement payment tracking methods: `recordPayment`, `getPaymentsByContract`, `calculateContractBalance` (Total - Sum(Payments)).
  - [x] 2.4 Implement staff payout methods: `recordPayout`, `getPayoutsByStaff`, `calculateStaffEarnings` (Completed Appointments * Rate).
  - [x] 2.5 Implement `linkAppointmentToContract` and `getAppointmentsByContract` to support tracking usage.
  - [x] 2.6 Add unit tests for `financeService.ts` in `src/services/__tests__/financeService.test.ts` covering calculations and edge cases.

- [ ] 3.0 Finance Dashboard (UI)
  - [x] 3.1 Create the main finance layout and navigation in `src/app/finance/layout.tsx` (Sidebar/Tabs for Contracts, Payouts).
  - [x] 3.2 Implement `src/app/finance/page.tsx` to fetch and display a summary of active contracts.
  - [ ] 3.3 Create a `ContractListTable` component to show Patient, Service, Dates, Total, Paid, and Balance.
  - [ ] 3.4 Add color-coding logic for overdue balances (e.g., Red text if Balance > 0 and due date passed).
  - [ ] 3.5 Add "Quick Actions" to the dashboard (Add Contract, Quick Payment).
  - [ ] 3.6 Implement data fetching strategies (Server Components or React Query) for real-time dashboard updates.

- [ ] 4.0 Contract Management & Details (UI)
  - [ ] 4.1 Create `src/app/finance/contracts/[id]/page.tsx` for detailed contract view.
  - [ ] 4.2 Implement `ContractForm` component in `src/components/finance/ContractForm.tsx` handling "Monthly" and "Session Pack" types.
  - [ ] 4.3 Build the "Financial Summary" section on the details page (Total Cost, Total Paid, Outstanding Balance).
  - [ ] 4.4 Implement "Payment History" list with a button to trigger `PaymentModal`.
  - [ ] 4.5 Create `PaymentModal` component in `src/components/finance/PaymentModal.tsx` for recording new client payments.
  - [ ] 4.6 Implement "Linked Appointments" section showing attendance status and "Used Sessions" count.

- [ ] 5.0 Staff Payouts System (UI & Logic)
  - [ ] 5.1 Create `src/app/finance/payouts/page.tsx` for the staff payout dashboard.
  - [ ] 5.2 Implement logic to calculate "Total Earned" dynamically based on completed appointments linked to contracts.
  - [ ] 5.3 Display a list of outsourced staff with columns: Worked Days/Sessions, Total Earned, Total Paid, Pending Pay.
  - [ ] 5.4 Create `PayoutModal` in `src/components/finance/PayoutModal.tsx` to record new staff payouts.
  - [ ] 5.5 Add a "Payout History" view/expandable row for each staff member to show past payouts.
  - [ ] 5.6 Ensure accurate calculation of "Pending Pay" (`Total Earned` - `Total Paid Out`) and display it prominently.

- [ ] 6.0 Integration & Advanced Features
  - [ ] 6.1 Implement "One-Click Renew" functionality to clone a contract for the next period (updating dates automatically).
  - [ ] 6.2 Add PDF Receipt generation for payments (or a printable view for `src/app/finance/receipt/[id]/page.tsx`).
  - [ ] 6.3 Integrate `service_contract_id` selection into the main Appointment creation/edit modal (optional/advanced).
  - [ ] 6.4 Add validation: Warning when booking an appointment if the linked contract is expired or out of sessions.
  - [ ] 6.5 Implement "Soft Delete" or "Terminate" logic for contracts (updating status to 'terminated').
  - [ ] 6.6 Perform a comprehensive E2E test for the full flow: Create Contract -> Link Appt -> Pay -> Staff Payout.
