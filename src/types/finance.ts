// Finance domain types based on Supabase schema

export type ContractType = 'monthly' | 'session_pack';
export type ContractStatus = 'draft' | 'active' | 'completed' | 'terminated';
export type FinanceServiceType = 'caregiver' | 'physiotherapy' | 'nursing' | 'doctor' | 'other';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';

export interface ServiceContract {
  id: string;
  patient_id: string;
  contract_type: ContractType;
  service_type: FinanceServiceType;
  start_date: string;
  end_date?: string | null;
  total_sessions?: number | null;
  total_amount: number;
  status: ContractStatus;
  staff_payment_rate?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractPayment {
  id: string;
  contract_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  reference?: string | null;
  receipt_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffPayout {
  id: string;
  staff_id: string;
  amount: number;
  payout_date: string;
  notes?: string | null;
  related_contract_id?: string | null;
  created_at: string;
  updated_at: string;
}







