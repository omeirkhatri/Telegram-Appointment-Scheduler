'use client';

import Header from '@/components/layout/Header';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      <Header currentPage="dashboard" />
      <main className="px-8 py-8">
        <h1 className="text-3xl font-bold text-[--foreground]">Dashboard</h1>
        <p className="text-[--muted-foreground] text-lg mt-1">Welcome back, Admin</p>
      </main>
    </div>
  );
}
