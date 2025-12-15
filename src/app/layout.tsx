import { KeyboardShortcutsProvider } from '@/components/providers/KeyboardShortcutsProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/ToastContainer';
import { DebugProvider } from '@/hooks/useDebugState';
import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    return (
      <html lang='en'>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ErrorBoundary>
            <ToastProvider>
              <DebugProvider>
                <KeyboardShortcutsProvider>
                  {children}
                </KeyboardShortcutsProvider>
              </DebugProvider>
            </ToastProvider>
          </ErrorBoundary>
        </body>
      </html>
    );
  } catch (error) {
    console.error('RootLayout error:', error);
    // Return a minimal layout on error
    return (
      <html lang='en'>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Application Error</h1>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <pre className="text-xs text-left bg-gray-100 p-4 rounded overflow-auto max-w-2xl">
                {error instanceof Error ? error.stack : String(error)}
              </pre>
            </div>
          </div>
        </body>
      </html>
    );
  }
}
