import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

const NAV_LINKS = [
  {
    title: 'Contracts',
    description: 'Create, renew, and monitor client agreements.',
    href: '/finance',
  },
  {
    title: 'Payments',
    description: 'Record receivables and reconcile balances.',
    href: '/finance/payments',
  },
  {
    title: 'Payouts',
    description: 'Track staff earnings and pending dues.',
    href: '/finance/payouts',
  },
];

const QUICK_ACTIONS = [
  { label: 'New Contract', href: '/finance/contracts/new' },
  { label: 'Record Payment', href: '/finance/payments/new' },
  { label: 'Record Payout', href: '/finance/payouts/new' },
];

const SUMMARY_CARDS = [
  { label: 'Active Contracts', placeholder: '—' },
  { label: 'Outstanding Balance', placeholder: '—' },
  { label: 'Pending Payouts', placeholder: '—' },
];

type FinanceLayoutProps = {
  children: ReactNode;
};

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="w-full rounded-2xl border border-border/50 bg-background/80 p-6 shadow-sm lg:w-72 lg:flex-shrink-0">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Finance Hub
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">Controls</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Centralize contracts, payments, and staff payouts from a single workspace.
              </p>
            </div>

            <nav className="space-y-3">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'block rounded-xl border border-transparent bg-muted/60 px-4 py-3 transition hover:border-border hover:bg-background',
                  )}
                  prefetch={false}
                >
                  <p className="text-sm font-semibold text-foreground">{link.title}</p>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </Link>
              ))}
            </nav>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick Actions
              </p>
              <div className="space-y-2">
                {QUICK_ACTIONS.map(action => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex w-full items-center justify-between rounded-lg border border-dashed border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground/40 hover:bg-background"
                    prefetch={false}
                  >
                    {action.label}
                    <span aria-hidden>↗</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Upcoming
              </p>
              <p className="mt-2 text-sm text-foreground">
                Full revenue analytics and staff cost dashboards arrive in Task 3.5+
              </p>
            </div>
          </div>
        </aside>

        <div className="flex-1 space-y-8">
          <header className="space-y-6 rounded-3xl border border-border/60 bg-background/70 p-6 shadow-sm backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Finance & Payments
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">Contracts & Payouts</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Monitor client balances, record payments, and ensure outsourced staff are paid on
                time.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUMMARY_CARDS.map(card => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-dashed border-border/60 bg-muted/40 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <div className="mt-3 h-6 w-24 animate-pulse rounded-full bg-muted" aria-hidden />
                  <span className="sr-only">{card.placeholder}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {NAV_LINKS.map(link => (
                <Link
                  key={`tab-${link.href}`}
                  href={link.href}
                  className="rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-foreground hover:text-foreground"
                  prefetch={false}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </header>

          <main className="space-y-6 rounded-3xl border border-border/60 bg-background/80 p-6 shadow">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}







