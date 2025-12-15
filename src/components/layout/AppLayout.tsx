'use client';

import { cn } from '@/lib/utils/cn';
import { NewSidebar } from './NewSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[--background]">
      <NewSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className={cn('w-full p-6 space-y-6', className)}>
          {children}
        </div>
      </main>
    </div>
  );
}
