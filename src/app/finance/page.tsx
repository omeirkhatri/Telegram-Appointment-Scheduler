'use client';

import { financeService } from '@/services/financeService';
import type { ServiceContract } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import { FileText, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface ContractSummary {
  contract: ServiceContract;
  balance: {
    totalAmount: number;
    totalPaid: number;
    balance: number;
  };
  isOverdue: boolean;
}

export default function FinanceDashboardPage() {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToastContext();

  const fetchActiveContracts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const activeContracts = await financeService.listContracts(
        { status: 'active' },
        { limit: 50, includeTerminated: false }
      );

      const summaries: ContractSummary[] = await Promise.all(
        activeContracts.map(async (contract) => {
          const balance = await financeService.calculateContractBalance(contract.id);
          const today = new Date();
          const endDate = contract.end_date ? new Date(contract.end_date) : null;
          const isOverdue = balance.balance > 0 && endDate && endDate < today;

          return {
            contract,
            balance,
            isOverdue,
          };
        })
      );

      setContracts(summaries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch contracts';
      setError(message);
      console.error('Error fetching contracts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveContracts();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message: error,
      });
    }
  }, [error, showToast]);

  const totalOutstanding = contracts.reduce((sum, c) => sum + c.balance.balance, 0);
  const overdueCount = contracts.filter((c) => c.isOverdue).length;
  const activeCount = contracts.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Active Contracts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor client agreements, payments, and outstanding balances
          </p>
        </div>
        <button
          onClick={fetchActiveContracts}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground hover:bg-background disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '—' : activeCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently active service agreements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '—' : `AED ${totalOutstanding.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total unpaid across all contracts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', overdueCount > 0 && 'text-destructive')}>
              {isLoading ? '—' : overdueCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contracts with overdue balances
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading contracts...</p>
            </div>
          </CardContent>
        </Card>
      ) : contracts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">No active contracts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first service contract to get started
                </p>
              </div>
              <Link
                href="/finance/contracts/new"
                className="mt-4 rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground hover:bg-background"
              >
                New Contract
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map((summary) => (
            <Link
              key={summary.contract.id}
              href={`/finance/contracts/${summary.contract.id}`}
              className="block"
            >
              <Card className="transition hover:border-foreground/40 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          Contract #{summary.contract.id.slice(0, 8)}
                        </h3>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            summary.isOverdue
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {summary.isOverdue ? 'Overdue' : summary.contract.status}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Service</p>
                          <p className="font-medium text-foreground capitalize">
                            {summary.contract.service_type.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Period</p>
                          <p className="font-medium text-foreground">
                            {new Date(summary.contract.start_date).toLocaleDateString()}
                            {summary.contract.end_date &&
                              ` - ${new Date(summary.contract.end_date).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-medium text-foreground capitalize">
                            {summary.contract.contract_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6 text-right space-y-1">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-semibold text-foreground">
                          AED {summary.balance.totalAmount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-sm font-medium text-foreground">
                          AED {summary.balance.totalPaid.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p
                          className={cn(
                            'text-xs text-muted-foreground',
                            summary.balance.balance > 0 && 'text-destructive'
                          )}
                        >
                          Balance
                        </p>
                        <p
                          className={cn(
                            'text-lg font-semibold',
                            summary.balance.balance > 0 ? 'text-destructive' : 'text-foreground'
                          )}
                        >
                          AED {summary.balance.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}







