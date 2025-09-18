import { KeyboardShortcutsProvider } from '@/components/providers/KeyboardShortcutsProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/ToastContainer';
import type { Metadata } from 'next';
import './globals.css';

// Use system fonts as fallback to avoid Google Fonts connectivity issues
const geistSans = {
  variable: '--font-geist-sans',
};

const geistMono = {
  variable: '--font-geist-mono',
};

export const metadata: Metadata = {
  title: 'MediCare Scheduler',
  description: 'Healthcare appointment scheduling system for Best DOC',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <KeyboardShortcutsProvider>
              {children}
            </KeyboardShortcutsProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
