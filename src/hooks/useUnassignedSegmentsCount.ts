import { isDriverAssignmentOverhaulEnabled } from '@/lib/featureFlags';
import { useEffect, useState } from 'react';

interface UnassignedCount {
  count: number;
  isLoading: boolean;
  error: string | null;
}

export function useUnassignedSegmentsCount(): UnassignedCount {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDriverAssignmentOverhaulEnabled()) {
      setIsLoading(false);
      return;
    }

    const fetchUnassignedCount = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/transportation-segments/unassigned-count');
        if (!response.ok) {
          throw new Error('Failed to fetch unassigned count');
        }

        const data = await response.json();
        setCount(data.count || 0);
      } catch (err) {
        console.error('Error fetching unassigned segments count:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch count');
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnassignedCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnassignedCount, 30000);

    return () => clearInterval(interval);
  }, []);

  return { count, isLoading, error };
}



