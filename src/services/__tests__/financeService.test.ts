import {
    clearAllMocks,
    mockSupabaseClient,
} from '@/utils/supabase-mocks';
import { financeService } from '../financeService';

const baseContract = {
  id: 'contract-1',
  patient_id: 'patient-1',
  contract_type: 'monthly' as const,
  service_type: 'caregiver' as const,
  start_date: '2024-01-01',
  total_amount: 1500.75,
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const seedContract = (overrides = {}) => {
  const record = { ...baseContract, ...overrides };
  mockSupabaseClient.setTableData('service_contracts', [record]);
  return record;
};

describe('financeService', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe('calculateContractBalance', () => {
    it('returns rounded balance based on contract total and payments', async () => {
      seedContract();
      mockSupabaseClient.setTableData('contract_payments', [
        {
          id: 'payment-1',
          contract_id: 'contract-1',
          amount: 400.33,
          payment_date: '2024-01-05',
          method: 'cash',
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-05T00:00:00Z',
        },
        {
          id: 'payment-2',
          contract_id: 'contract-1',
          amount: 200.22,
          payment_date: '2024-01-10',
          method: 'card',
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-10T00:00:00Z',
        },
      ]);

      const balance = await financeService.calculateContractBalance('contract-1');

      expect(balance).toEqual({
        totalAmount: 1500.75,
        totalPaid: 600.55,
        balance: 900.2, // rounded to two decimals
      });
    });

    it('throws when the contract cannot be found', async () => {
      mockSupabaseClient.setTableData('service_contracts', []);
      mockSupabaseClient.setTableData('contract_payments', []);

      await expect(financeService.calculateContractBalance('missing-contract')).rejects.toEqual(
        expect.objectContaining({ code: 'PGRST116' }),
      );
    });
  });

  describe('calculateStaffEarnings', () => {
    it('sums payouts and returns placeholder earnings totals', async () => {
      mockSupabaseClient.setTableData('staff', [
        {
          id: 'staff-1',
          first_name: 'Alice',
          last_name: 'Care',
          staff_type: 'caregiver',
          status: 'active',
          phone: '+971500000000',
          email: 'alice@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          default_payment_rate: 250,
        },
      ]);
      mockSupabaseClient.setTableData('staff_payouts', [
        {
          id: 'payout-1',
          staff_id: 'staff-1',
          amount: 300,
          payout_date: '2024-02-01',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
        {
          id: 'payout-2',
          staff_id: 'staff-1',
          amount: 150,
          payout_date: '2024-02-10',
          created_at: '2024-02-10T00:00:00Z',
          updated_at: '2024-02-10T00:00:00Z',
        },
      ]);

      const summary = await financeService.calculateStaffEarnings('staff-1');

      expect(summary).toEqual({
        totalEarned: 0,
        totalPaid: 450,
        pendingPay: -450,
      });
    });

    it('throws if the staff record does not exist', async () => {
      mockSupabaseClient.setTableData('staff', []);
      mockSupabaseClient.setTableData('staff_payouts', []);

      await expect(financeService.calculateStaffEarnings('unknown-staff')).rejects.toEqual(
        expect.objectContaining({ code: 'PGRST116' }),
      );
    });
  });

  describe('linkAppointmentToContract', () => {
    it('throws when the appointment cannot be found', async () => {
      mockSupabaseClient.setTableData('appointments', []);

      await expect(
        financeService.linkAppointmentToContract({
          appointmentId: 'missing-appointment',
          contractId: 'contract-1',
        }),
      ).rejects.toEqual(expect.objectContaining({ code: 'PGRST116' }));
    });

    it('links successfully when appointment exists', async () => {
      mockSupabaseClient.setTableData('appointments', [
        {
          id: 'appointment-1',
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '09:00',
          duration_minutes: 60,
          status: 'scheduled',
          custom_fields: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]);

      await expect(
        financeService.linkAppointmentToContract({
          appointmentId: 'appointment-1',
          contractId: 'contract-1',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getAppointmentsByContract', () => {
    it('returns normalized appointment details with patient address when attendance is requested', async () => {
      mockSupabaseClient.setTableData('appointments', [
        {
          id: 'appointment-1',
          service_contract_id: 'contract-1',
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '09:00',
          duration_minutes: 60,
          status: 'scheduled',
          custom_fields: null,
          patient: {
            id: 'patient-1',
            name: 'John Patient',
            phone: '+971500000000',
            flat_villa_no: 'Villa 5',
            building_street: 'Healthcare St',
            area: 'Downtown',
            city: 'Dubai',
          },
          appointment_staff: [
            {
              id: 'assign-1',
              staff_id: 'staff-1',
              role: 'primary',
              is_primary: true,
              staff: {
                id: 'staff-1',
                first_name: 'Alice',
                last_name: 'Care',
                staff_type: 'caregiver',
                phone: '+971500000001',
                email: 'alice@example.com',
              },
            },
          ],
        },
      ]);

      const appointments = await financeService.getAppointmentsByContract({
        contractId: 'contract-1',
        includeAttendance: true,
      });

      expect(appointments).toHaveLength(1);
      expect(appointments[0].patient?.address).toBe('Villa 5, Healthcare St, Downtown, Dubai');
      expect(appointments[0].custom_fields).toEqual({});
      expect(appointments[0].appointment_staff).toHaveLength(1);
    });
  });
});







