'use client';

import { getCurrentDubaiTime } from '@/utils/timezone';
import { useCallback, useEffect, useState } from 'react';

interface TimeDisplayProps {
  className?: string;
}

export function TimeDisplay({ className = '' }: TimeDisplayProps) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [isClient, setIsClient] = useState(false);


  const updateTime = useCallback(() => {
    try {
      const newTime = getCurrentDubaiTime();
      setCurrentTime(newTime);
    } catch (error) {
      console.error('Error updating time:', error);
      // Fallback to regular Date if timezone function fails
      setCurrentTime(new Date());
    }
  }, []);

  useEffect(() => {
    // Set client-side flag to prevent hydration mismatches
    setIsClient(true);

    let intervalId: NodeJS.Timeout | null = null;

    // Update time immediately
    updateTime();

    // Calculate time until next minute boundary
    const now = new Date();
    const secondsUntilNextMinute = 60 - now.getSeconds();
    const millisecondsUntilNextMinute = secondsUntilNextMinute * 1000;

    // Set timeout to update at the exact minute boundary
    const timeout = setTimeout(() => {
      updateTime();

      // Then set up interval to update every minute after that
      intervalId = setInterval(updateTime, 60000);
    }, millisecondsUntilNextMinute);

    // Cleanup function
    return () => {
      clearTimeout(timeout);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [updateTime]);

  // Format time as "11:17 PM"
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dubai'
    });
  };

  // Format date as "Monday, 8 September"
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Asia/Dubai'
    });
  };

  // Don't render until client-side to prevent hydration mismatch
  if (!isClient) {
    return (
      <div className={`flex items-center space-x-2 text-sm text-[--muted-foreground] ${className}`}>
        <span className="font-mono font-medium text-[--foreground]">
          --:-- --
        </span>
        <span className="text-[--muted-foreground]/60">•</span>
        <span className="font-medium text-[--foreground]">
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-sm text-[--muted-foreground] ${className}`}>
      <span className="font-mono font-medium text-[--foreground]">
        {formatTime(currentTime)}
      </span>
      <span className="text-[--muted-foreground]/60">•</span>
      <span className="font-medium text-[--foreground]">
        {formatDate(currentTime)}
      </span>
    </div>
  );
}
