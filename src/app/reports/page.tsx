'use client';

import { ReportsDashboard } from '@/components/features/reports';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and view system reports"
      />

      {/* Main Content */}
      <main className="px-4 py-8">
        <ReportsDashboard />
      </main>
    </>
  );
}
