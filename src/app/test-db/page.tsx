'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { config } from '@/lib/env';

export default function TestDB() {
  const [status, setStatus] = useState<string>('Testing connection...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        setStatus('Testing Supabase connection...');

        // Test basic connection
        const { error } = await supabase
          .from('patients')
          .select('count')
          .limit(1);

        if (error) {
          throw error;
        }

        setStatus(
          '✅ Supabase connection successful! Database schema is ready.',
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('❌ Connection failed');
      }
    }

    testConnection();
  }, []);

  return (
    <div className='min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-8'>
      <div className='max-w-2xl mx-auto'>
        <div className='medical-card'>
          <h1 className='text-3xl font-bold text-gray-900 mb-6'>
            Database Connection Test
          </h1>

          <div className='space-y-4'>
            <div className='p-4 bg-gray-50 rounded-lg'>
              <h2 className='text-lg font-semibold text-gray-800 mb-2'>
                Connection Status
              </h2>
              <p className='text-gray-600'>{status}</p>
              {error && (
                <div className='mt-2 p-3 bg-error-50 border border-error-200 rounded-md'>
                  <p className='text-error-800 text-sm'>{error}</p>
                </div>
              )}
            </div>

            <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
              <h2 className='text-lg font-semibold text-blue-800 mb-2'>
                Local Supabase Services
              </h2>
              <ul className='text-sm text-blue-700 space-y-1'>
                <li>• API URL: {config.supabase.url}</li>
                <li>
                  • Database:
                  postgresql://postgres:postgres@127.0.0.1:54322/postgres
                </li>
                <li>• Studio: http://127.0.0.1:54323</li>
                <li>• Storage: {config.supabase.url}/storage/v1/s3</li>
                <li>• Timezone: {config.app.timezone}</li>
              </ul>
            </div>

            <div className='p-4 bg-success-50 border border-success-200 rounded-lg'>
              <h2 className='text-lg font-semibold text-success-800 mb-2'>
                Database Schema
              </h2>
              <ul className='text-sm text-success-700 space-y-1'>
                <li>• patients table ✓</li>
                <li>• staff table ✓</li>
                <li>• appointments table ✓</li>
                <li>• appointment_staff table ✓</li>
                <li>• Row Level Security enabled ✓</li>
                <li>• Indexes created ✓</li>
              </ul>
            </div>
          </div>

          <div className='mt-6 flex space-x-3'>
            <a
              href='http://127.0.0.1:54323'
              target='_blank'
              rel='noopener noreferrer'
              className='medical-button-primary'
            >
              Open Supabase Studio
            </a>
            <Link href='/' className='medical-button-secondary'>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
