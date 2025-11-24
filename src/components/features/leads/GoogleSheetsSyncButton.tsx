'use client';

import { useState } from 'react';

interface GoogleSheetsSyncButtonProps {
  onSyncComplete?: () => void;
}

export function GoogleSheetsSyncButton({ onSyncComplete }: GoogleSheetsSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/google-sheets/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sync Google Sheets');
      }

      const data = await response.json();
      setLastSync(new Date().toLocaleString());
      onSyncComplete?.();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
          Syncing...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync Google Sheets
        </>
      )}
      {lastSync && (
        <span className="ml-2 text-xs text-gray-500">
          Last: {lastSync}
        </span>
      )}
    </button>
  );
}



