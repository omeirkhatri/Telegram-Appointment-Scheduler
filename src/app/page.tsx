export default function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50'>
      <div className='container mx-auto px-4 py-12'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='text-center mb-12'>
            <h1 className='text-5xl font-bold text-primary-900 mb-4'>
              MediCare Scheduler
            </h1>
            <p className='text-xl text-secondary-600 mb-8'>
              Healthcare appointment scheduling system for Best DOC
            </p>
            <div className='flex justify-center space-x-4'>
              <span className='status-active'>Active</span>
              <span className='status-pending'>Pending</span>
              <span className='status-completed'>Completed</span>
              <span className='status-cancelled'>Cancelled</span>
            </div>
          </div>

          {/* Healthcare UI Theme Showcase */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12'>
            {/* Medical Card */}
            <div className='medical-card'>
              <div className='flex items-center mb-4'>
                <div className='w-3 h-3 bg-medical-blue rounded-full mr-3' />
                <h3 className='text-lg font-semibold text-gray-900'>
                  Medical Blue
                </h3>
              </div>
              <p className='text-secondary-600 text-sm mb-4'>
                Primary medical interface color for professional healthcare
                applications.
              </p>
              <button className='medical-button-primary w-full'>
                Primary Action
              </button>
            </div>

            {/* Health Card */}
            <div className='medical-card'>
              <div className='flex items-center mb-4'>
                <div className='w-3 h-3 bg-medical-green rounded-full mr-3' />
                <h3 className='text-lg font-semibold text-gray-900'>
                  Health Green
                </h3>
              </div>
              <p className='text-secondary-600 text-sm mb-4'>
                Success states and positive health indicators.
              </p>
              <button className='medical-button-success w-full'>
                Success Action
              </button>
            </div>

            {/* Emergency Card */}
            <div className='medical-card'>
              <div className='flex items-center mb-4'>
                <div className='w-3 h-3 bg-medical-red rounded-full mr-3' />
                <h3 className='text-lg font-semibold text-gray-900'>
                  Emergency Red
                </h3>
              </div>
              <p className='text-secondary-600 text-sm mb-4'>
                Critical alerts and emergency notifications.
              </p>
              <button className='medical-button-error w-full'>
                Emergency Action
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className='medical-card'>
            <h2 className='text-2xl font-bold text-gray-900 mb-6 text-center'>
              Project Setup Progress
            </h2>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-gray-700'>
                  Next.js 14 Setup
                </span>
                <span className='status-active'>✓ Complete</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-gray-700'>
                  Tailwind Healthcare Theme
                </span>
                <span className='status-active'>✓ Complete</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-gray-700'>
                  Supabase Setup
                </span>
                <span className='status-pending'>⏳ Pending</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-gray-700'>
                  Database Schema
                </span>
                <span className='status-pending'>⏳ Pending</span>
              </div>
            </div>
          </div>

          {/* Feature Preview */}
          <div className='mt-8 text-center'>
            <p className='text-secondary-600 mb-4'>
              🚧 More features coming soon...
            </p>
            <div className='flex justify-center space-x-3'>
              <button className='medical-button-secondary'>
                View Calendar
              </button>
              <button className='medical-button-primary'>
                Manage Appointments
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
