'use client';

import Header from '@/components/layout/Header';
import { ReportsDashboard } from '@/components/features/reports';

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* Header with Navigation */}
      <Header currentPage="reports" />

      {/* Main Content */}
      <main className="px-8 py-8">
        <ReportsDashboard />
      </main>
    </div>
  );
}
