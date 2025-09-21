import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Best DOC ("we," "our," or "us") operates the MediCare Scheduler application 
                (the "Service") at https://schedule.n8nbdoc.com/. This Privacy Policy explains 
                how we collect, use, disclose, and safeguard your information when you use our 
                healthcare appointment scheduling system.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">2.1 Personal Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Patient names, contact information, and medical appointment details</li>
                <li>Staff member information including names, roles, and contact details</li>
                <li>Appointment schedules, medical notes, and treatment information</li>
                <li>Authentication information (email addresses for login)</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.2 Google Calendar Integration</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>OAuth tokens for Google Calendar synchronization (encrypted and stored securely)</li>
                <li>Calendar event data for appointment synchronization</li>
                <li>Staff calendar connection status and preferences</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.3 Technical Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>IP addresses and device information</li>
                <li>Usage analytics and system performance data</li>
                <li>Error logs and debugging information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>To provide healthcare appointment scheduling services</li>
                <li>To synchronize appointments with staff Google Calendars (with consent)</li>
                <li>To send appointment reminders and notifications via Telegram</li>
                <li>To maintain accurate medical records and appointment history</li>
                <li>To improve our services and user experience</li>
                <li>To ensure system security and prevent fraud</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement comprehensive security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>All data is encrypted in transit using HTTPS/TLS</li>
                <li>OAuth tokens are encrypted before database storage</li>
                <li>Row-level security (RLS) protects data access</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Google Calendar Integration</h2>
              <p className="text-gray-700 mb-4">
                When you connect your Google Calendar:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>We only access calendar data necessary for appointment synchronization</li>
                <li>OAuth tokens are encrypted and stored securely</li>
                <li>You can disconnect your calendar at any time</li>
                <li>We do not access personal calendar data beyond appointment synchronization</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Sharing</h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and prevent fraud</li>
                <li>With trusted service providers who assist in operating our service (under strict confidentiality agreements)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-gray-700 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Withdraw consent for Google Calendar integration</li>
                <li>Export your data in a portable format</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your information for as long as necessary to provide our services and comply with legal obligations. 
                Medical records may be retained longer as required by healthcare regulations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> omeirbestdoc@gmail.com<br/>
                  <strong>Website:</strong> https://schedule.n8nbdoc.com/
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
