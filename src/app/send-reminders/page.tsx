'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';
import { useState } from 'react';

export default function SendRemindersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const sendReminders = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/send-reminder-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
      setLastSent(new Date().toLocaleString());

    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to send reminders'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send 30-Minute Reminders
          </CardTitle>
          <CardDescription>
            Manually send 30-minute appointment reminders to all staff members.
            This will find appointments starting in 25-35 minutes and send Telegram notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={sendReminders}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Reminders Now
                </>
              )}
            </Button>

            {lastSent && (
              <div className="text-sm text-gray-500 flex items-center">
                Last sent: {lastSent}
              </div>
            )}
          </div>

          {result && (
            <div className="mt-4">
              {result.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Reminders Sent Successfully!</span>
                  </div>
                  <p className="text-green-700">{result.message}</p>

                  {result.appointments && result.appointments.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-green-800">Appointments processed:</p>
                      <ul className="text-sm text-green-700 mt-1">
                        {result.appointments.map((apt: any, index: number) => (
                          <li key={index}>
                            • {apt.time} - Patient {apt.patient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.results && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-green-800">Results:</p>
                      <ul className="text-sm text-green-700 mt-1">
                        {result.results.map((r: any, index: number) => (
                          <li key={index}>
                            • Appointment {r.appointmentId}: {r.success ? '✅' : '❌'}
                            {r.notificationsSent && ` (${r.notificationsSent} sent)`}
                            {r.error && ` - ${r.error}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Error Sending Reminders</span>
                  </div>
                  <p className="text-red-700">{result.error}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">How to use:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Click "Send Reminders Now" button</li>
              <li>2. System will find appointments starting in 25-35 minutes</li>
              <li>3. Telegram notifications will be sent to assigned staff</li>
              <li>4. Check the results to see what was sent</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
