'use client';

import { BackupSection } from '@/components/backup';
import { AutomatedEmailSection, EmailPreferencesSection, EmailTestSection, StaffPreferencesSection } from '@/components/email';
import { GoogleCalendarSection, SyncSettingsPanel, SyncStatusCard } from '@/components/google-calendar';
import Header from '@/components/layout/Header';

export default function SettingsPage() {

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* Header with Navigation */}
      <Header currentPage="settings" />

      {/* Main Content - Full Width */}
      <main className="px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[--foreground]">Settings</h1>
            <p className="text-[--muted-foreground] text-lg mt-1">Configure application preferences and system settings</p>
          </div>
        </div>

        {/* Settings grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* General Settings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-[--foreground] mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[--foreground] mb-2">Organization Name</label>
                  <input
                    type="text"
                    defaultValue="MediCare Scheduler"
                    className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
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
            </div>

            {/* Email Preferences Section */}
            <EmailPreferencesSection />

            <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-[--foreground] mb-4">Security Settings</h3>
              <div className="space-y-4">
                <button className="w-full px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground]">
                  Change Password
                </button>
                <button className="w-full px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground]">
                  Two-Factor Authentication
                </button>
                <button className="w-full px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground]">
                  Session Management
                </button>
              </div>
            </div>

            {/* Email Testing Section */}
            <EmailTestSection />

            {/* Staff Preferences Section */}
            <StaffPreferencesSection />

            {/* Automated Email Section */}
            <AutomatedEmailSection />

            {/* Google Calendar Integration Section */}
            <GoogleCalendarSection />

            {/* Google Calendar Sync Settings */}
            <SyncSettingsPanel />
          </div>

          {/* Backup & Export */}
          <div className="space-y-6">
            {/* Google Calendar Sync Status */}
            <SyncStatusCard />

            {/* Backup Section */}
            <BackupSection />

            <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
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
            </div>

            <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-[--foreground] mb-4">Support</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground]">
                  Documentation
                </button>
                <button className="w-full px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground]">
                  Contact Support
                </button>
                <button className="w-full px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground]">
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="px-6 py-3 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors">
            Save Changes
          </button>
        </div>
      </main>
    </div>
  );
}
