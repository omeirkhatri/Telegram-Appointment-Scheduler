import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/types';
import type {
  ContractPayment,
  ContractStatus,
  ServiceContract,
  StaffPayout,
} from '@/types/finance';

const APPOINTMENT_SELECT_BASE = `
  *,
  patient:patients(
    id,
    name,
    phone,
    flat_villa_no,
    building_street,
    area,
    city,
    latitude,
    longitude
  )
`;

const APPOINTMENT_SELECT_WITH_ATTENDANCE = `
  *,
  patient:patients(
    id,
    name,
    phone,
    flat_villa_no,
    building_street,
    area,
    city,
    latitude,
    longitude
  ),
  appointment_staff(
    id,
    staff_id,
    role,
    is_primary,
    staff:staff(
      id,
      first_name,
      last_name,
      staff_type,
      specialization,
      phone,
      email
    )
  )
`;

type FinanceOperation =
  | 'createContract'
  | 'updateContract'
  | 'getContract'
  | 'listContracts'
  | 'recordPayment'
  | 'getPaymentsByContract'
  | 'calculateContractBalance'
  | 'recordPayout'
  | 'getPayoutsByStaff'
  | 'calculateStaffEarnings'
  | 'linkAppointmentToContract'
  | 'getAppointmentsByContract';

type AppointmentRow = Omit<Appointment, 'custom_fields'> & {
  custom_fields?: Record<string, unknown> | null;
};

export interface ContractFilters {
  status?: ContractStatus;
  patientId?: string;
  search?: string;
}

export interface ListContractsOptions {
  limit?: number;
  offset?: number;
  includeTerminated?: boolean;
}

export type CreateContractPayload = Omit<
  ServiceContract,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateContractPayload = Partial<
  Omit<ServiceContract, 'created_at' | 'updated_at'>
>;

export type RecordPaymentPayload = Omit<
  ContractPayment,
  'id' | 'created_at' | 'updated_at'
>;

export interface PaymentQuery {
  contractId: string;
}

export type RecordPayoutPayload = Omit<
  StaffPayout,
  'id' | 'created_at' | 'updated_at'
>;

export interface StaffPayoutQuery {
  staffId: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AppointmentContractLinkPayload {
  appointmentId: string;
  contractId: string;
}

export interface AppointmentContractFilters {
  contractId: string;
  includeAttendance?: boolean;
}

export interface ContractBalanceSummary {
  totalAmount: number;
  totalPaid: number;
  balance: number;
}

export interface StaffEarningsSummary {
  totalEarned: number;
  totalPaid: number;
  pendingPay: number;
}

class FinanceService {
  private readonly logPrefix = '💰 [FinanceService]';

  private assertClient() {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }
    return supabase;
  }

  private logInfo(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      console.log(`${this.logPrefix} ${message}`, meta);
      return;
    }
    console.log(`${this.logPrefix} ${message}`);
  }

  private logError(
    operation: FinanceOperation,
    error: unknown,
    meta?: Record<string, unknown>
  ) {
    console.error(`${this.logPrefix} ${operation} failed`, {
      error,
      ...(meta ?? {}),
    });
  }

  private formatError(operation: FinanceOperation, error: unknown): Error {
    if (error instanceof Error) {
      return new Error(`${operation} failed: ${error.message}`);
    }
    return new Error(`${operation} failed: ${JSON.stringify(error)}`);
  }

  private notImplemented(operation: FinanceOperation): never {
    throw new Error(`${operation} not implemented`);
  }

  private async withErrorHandling<T>(
    operation: FinanceOperation,
    fn: () => Promise<T>
  ): Promise<T> {
    this.logInfo(`Starting ${operation}`);
    try {
      const result = await fn();
      this.logInfo(`Completed ${operation}`);
      return result;
    } catch (error) {
      this.logError(operation, error);
      throw this.formatError(operation, error);
    }
  }

  private normalizeAppointments(data: unknown): Appointment[] {
    const appointments = (Array.isArray(data) ? data : []) as AppointmentRow[];
    return appointments.map(appointment => {
      const patient = appointment.patient;
      const address =
        patient?.address ??
        (patient?.flat_villa_no &&
        patient?.building_street &&
        patient?.area &&
        patient?.city
          ? `${patient.flat_villa_no}, ${patient.building_street}, ${patient.area}, ${patient.city}`
          : undefined);

      return {
        ...appointment,
        custom_fields: appointment.custom_fields ?? {},
        patient: patient
          ? {
              ...patient,
              address,
            }
          : undefined,
      };
    });
  }

  async createContract(payload: CreateContractPayload): Promise<ServiceContract> {
    return this.withErrorHandling('createContract', async () => {
      const client = this.assertClient();
      const { data, error } = await client
        .from('service_contracts')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as ServiceContract;
    });
  }

  async updateContract(
    contractId: string,
    updates: UpdateContractPayload
  ): Promise<ServiceContract> {
    return this.withErrorHandling('updateContract', async () => {
      const client = this.assertClient();
      const { data, error } = await client
        .from('service_contracts')
        .update(updates)
        .eq('id', contractId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as ServiceContract;
    });
  }

  async getContract(contractId: string): Promise<ServiceContract | null> {
    return this.withErrorHandling('getContract', async () => {
      const client = this.assertClient();
      const { data, error } = await client
        .from('service_contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) {
        if ((error as { code?: string }).code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as ServiceContract;
    });
  }

  async listContracts(
    filters?: ContractFilters,
    options?: ListContractsOptions
  ): Promise<ServiceContract[]> {
    return this.withErrorHandling('listContracts', async () => {
      const client = this.assertClient();
      let query = client
        .from('service_contracts')
        .select('*')
        .order('start_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.patientId) {
        query = query.eq('patient_id', filters.patientId);
      }

      if (filters?.search) {
        const term = filters.search.trim();
        if (term.length > 0) {
          const escaped = term.replace(/%/g, '\\%').replace(/_/g, '\\_');
          query = query.or(
            [
              `notes.ilike.%${escaped}%`,
              `service_type.ilike.%${escaped}%`,
              `contract_type.ilike.%${escaped}%`,
            ].join(',')
          );
        }
      }

      if (!options?.includeTerminated && !filters?.status) {
        query = query.not('status', 'eq', 'terminated');
      }

      if (typeof options?.offset === 'number') {
        const limit = options?.limit ?? 50;
        query = query.range(options.offset, options.offset + limit - 1);
      } else if (typeof options?.limit === 'number') {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data as ServiceContract[]) ?? [];
    });
  }

  async recordPayment(payload: RecordPaymentPayload): Promise<ContractPayment> {
    return this.withErrorHandling('recordPayment', async () => {
      const client = this.assertClient();
      const { data, error } = await client
        .from('contract_payments')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as ContractPayment;
    });
  }

  async getPaymentsByContract(
    query: PaymentQuery
  ): Promise<ContractPayment[]> {
    return this.withErrorHandling('getPaymentsByContract', async () => {
      const client = this.assertClient();
      const { data, error } = await client
        .from('contract_payments')
        .select('*')
        .eq('contract_id', query.contractId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data as ContractPayment[]) ?? [];
    });
  }

  async calculateContractBalance(
    contractId: string
  ): Promise<ContractBalanceSummary> {
    return this.withErrorHandling('calculateContractBalance', async () => {
      const client = this.assertClient();
      const [{ data: contract, error: contractError }, { data: payments, error: paymentsError }] =
        await Promise.all([
          client
            .from('service_contracts')
            .select('id,total_amount')
            .eq('id', contractId)
            .single(),
          client
            .from('contract_payments')
            .select('amount')
            .eq('contract_id', contractId),
        ]);

      if (contractError) {
        throw contractError;
      }

      if (!contract) {
        throw new Error('Contract not found');
      }

      if (paymentsError) {
        throw paymentsError;
      }

      const totalAmount = Number(contract.total_amount ?? 0);
      const totalPaid = (payments ?? []).reduce(
        (sum, payment) => sum + Number(payment.amount ?? 0),
        0
      );

      return {
        totalAmount,
        totalPaid,
        balance: Number((totalAmount - totalPaid).toFixed(2)),
      };
    });
  }

  async recordPayout(payload: RecordPayoutPayload): Promise<StaffPayout> {
    return this.withErrorHandling('recordPayout', async () => {
      const client = this.assertClient();
      const { data, error } = await client
        .from('staff_payouts')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as StaffPayout;
    });
  }

  async getPayoutsByStaff(
    query: StaffPayoutQuery
  ): Promise<StaffPayout[]> {
    return this.withErrorHandling('getPayoutsByStaff', async () => {
      const client = this.assertClient();
      let queryBuilder = client
        .from('staff_payouts')
        .select('*')
        .eq('staff_id', query.staffId)
        .order('payout_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (query.dateFrom) {
        queryBuilder = queryBuilder.gte('payout_date', query.dateFrom);
      }

      if (query.dateTo) {
        queryBuilder = queryBuilder.lte('payout_date', query.dateTo);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw error;
      }

      return (data as StaffPayout[]) ?? [];
    });
  }

  async calculateStaffEarnings(
    staffId: string
  ): Promise<StaffEarningsSummary> {
    return this.withErrorHandling('calculateStaffEarnings', async () => {
      const client = this.assertClient();

      const [{ data: staffRecord, error: staffError }, { data: payouts, error: payoutsError }] =
        await Promise.all([
          client
            .from('staff')
            .select('id, default_payment_rate')
            .eq('id', staffId)
            .single(),
          client
            .from('staff_payouts')
            .select('amount')
            .eq('staff_id', staffId),
        ]);

      if (staffError) {
        throw staffError;
      }

      if (!staffRecord) {
        throw new Error('Staff member not found');
      }

      if (payoutsError) {
        throw payoutsError;
      }

      const totalPaid = (payouts ?? []).reduce(
        (sum, payout) => sum + Number(payout.amount ?? 0),
        0
      );

      // TODO: replace placeholder once appointment-derived earnings are available.
      const totalEarned = Number((staffRecord.default_payment_rate ?? 0) * 0);

      return {
        totalEarned,
        totalPaid,
        pendingPay: Number((totalEarned - totalPaid).toFixed(2)),
      };
    });
  }

  async linkAppointmentToContract(
    payload: AppointmentContractLinkPayload
  ): Promise<void> {
    return this.withErrorHandling('linkAppointmentToContract', async () => {
      const client = this.assertClient();
      const { data, error } = await client
        .from('appointments')
        .update({ service_contract_id: payload.contractId })
        .eq('id', payload.appointmentId)
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Appointment not found');
      }
    });
  }

  async getAppointmentsByContract(
    filters: AppointmentContractFilters
  ): Promise<Appointment[]> {
    return this.withErrorHandling('getAppointmentsByContract', async () => {
      const client = this.assertClient();
      const select = filters.includeAttendance
        ? APPOINTMENT_SELECT_WITH_ATTENDANCE
        : APPOINTMENT_SELECT_BASE;

      const { data, error } = await client
        .from('appointments')
        .select(select)
        .eq('service_contract_id', filters.contractId)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      return this.normalizeAppointments(data);
    });
  }
}

export const financeService = new FinanceService();

export default financeService;
