'use client';

import { BackupSection } from '@/components/backup';
import OfficeSettings from '@/components/features/settings/OfficeSettings';
import TelegramSettings from '@/components/features/settings/TelegramSettings';
import { PageHeader } from '@/components/layout/PageHeader';
import { ShadButton as Button, ShadCard as Card, Input } from '@/components/ui';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure application preferences and system settings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[--foreground] mb-4">General Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">Organization Name</label>
                <Input
                  type="text"
                  defaultValue="MediCare Scheduler"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">Timezone</label>
                <select className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent">
                  <option>Asia/Dubai (GMT+4)</option>
                  <option>UTC (GMT+0)</option>
                  <option>America/New_York (GMT-5)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">Date Format</label>
                <select className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[--foreground] mb-4">Security Settings</h3>
            <div className="space-y-4">
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
              <Button variant="outline" className="w-full">
                Two-Factor Authentication
              </Button>
              <Button variant="outline" className="w-full">
                Session Management
              </Button>
            </div>
          </Card>

          <OfficeSettings />

          <TelegramSettings />
        </div>

        <div className="space-y-6">
          <BackupSection />

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[--foreground] mb-4">System Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[--muted-foreground]">Version:</span>
                <span className="text-[--foreground]">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--muted-foreground]">Last Updated:</span>
                <span className="text-[--foreground]">2024-01-15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--muted-foreground]">Database:</span>
                <span className="text-[--foreground]">PostgreSQL 15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--muted-foreground]">Environment:</span>
                <span className="text-[--foreground]">Production</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[--foreground] mb-4">Support</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full">
                Documentation
              </Button>
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
              <Button variant="outline" className="w-full">
                Report Issue
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button>
          Save Changes
        </Button>
      </div>
    </>
  );
}
