'use client';

import { EscalationDashboard } from '@/components/features/appointments/calendar/EscalationDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui';
import { isDriverAssignmentOverhaulEscalationEnabled } from '@/lib/featureFlags';

export default function EscalationsPage() {
  // Check if escalation feature is enabled
  const isEscalationEnabled = isDriverAssignmentOverhaulEscalationEnabled();

  // If feature is disabled, show access denied message
  if (!isEscalationEnabled) {
    return (
      <>
        <PageHeader
          title="Escalation Management"
          description="Monitor and manage escalation alerts for driver assignments"
        />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Feature Not Available</h1>
              <p className="text-gray-600 mb-4">
                Escalation management is currently disabled. This feature requires the Driver Assignment Overhaul escalation system to be enabled.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">To enable this feature:</h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Set <code className="bg-gray-200 px-1 rounded">DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION_ENABLED=true</code> in your environment variables</li>
                  <li>Ensure the escalation monitoring service is running</li>
                  <li>Configure duty manager notifications</li>
                </ol>
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Escalation Management"
        description="Monitor and manage escalation alerts for driver assignments"
      />
      <div className="container mx-auto px-4 py-8">
        <EscalationDashboard />
      </div>
    </>
  );
}
