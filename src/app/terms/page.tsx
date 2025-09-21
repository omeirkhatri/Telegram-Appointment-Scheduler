import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using the MediCare Scheduler application ("Service") operated by Best DOC 
                ("we," "our," or "us") at https://schedule.n8nbdoc.com/, you agree to be bound by these 
                Terms of Service ("Terms"). If you disagree with any part of these terms, you may not 
                access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                MediCare Scheduler is a healthcare appointment management system designed specifically for 
                Best DOC. The Service provides:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Appointment scheduling and management</li>
                <li>Patient and staff management</li>
                <li>Google Calendar integration for staff members</li>
                <li>Telegram notifications for appointment updates</li>
                <li>Real-time appointment tracking and updates</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts and Roles</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">3.1 Account Types</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Administrators:</strong> Full access to all system features and data</li>
                <li><strong>Caregivers:</strong> Access to schedules and appointment management</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">3.2 Account Security</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
                <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Google Calendar Integration</h2>
              <p className="text-gray-700 mb-4">
                The Service offers optional Google Calendar integration:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Integration requires explicit consent and OAuth authorization</li>
                <li>You can disconnect your calendar at any time</li>
                <li>We only access calendar data necessary for appointment synchronization</li>
                <li>Calendar integration is subject to Google's Terms of Service</li>
                <li>We are not responsible for Google Calendar service availability or changes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">5.1 Permitted Use</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Use the Service for legitimate healthcare appointment management</li>
                <li>Maintain accurate and up-to-date patient and appointment information</li>
                <li>Respect patient privacy and confidentiality</li>
                <li>Follow all applicable healthcare regulations and laws</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">5.2 Prohibited Use</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Use the Service for any unlawful purpose or in violation of any laws</li>
                <li>Attempt to gain unauthorized access to the Service or related systems</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Use the Service to transmit malicious code or harmful content</li>
                <li>Share your account credentials with unauthorized persons</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data and Privacy</h2>
              <p className="text-gray-700 mb-4">
                Your use of the Service is also governed by our Privacy Policy. By using the Service, 
                you consent to the collection and use of information as described in the Privacy Policy.
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>We implement appropriate security measures to protect your data</li>
                <li>You are responsible for ensuring patient data accuracy and compliance</li>
                <li>We may access your data to provide support and maintain the Service</li>
                <li>Data may be retained as required by law or for legitimate business purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Service Availability</h2>
              <p className="text-gray-700 mb-4">
                We strive to maintain high service availability but cannot guarantee uninterrupted access:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>The Service may be temporarily unavailable for maintenance or updates</li>
                <li>We are not liable for service interruptions beyond our reasonable control</li>
                <li>We reserve the right to modify or discontinue the Service with notice</li>
                <li>Emergency maintenance may be performed without prior notice</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                The Service and its original content, features, and functionality are owned by Best DOC 
                and are protected by international copyright, trademark, patent, trade secret, and other 
                intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, Best DOC shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages, including without limitation, 
                loss of profits, data, use, goodwill, or other intangible losses, resulting from your 
                use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to defend, indemnify, and hold harmless Best DOC and its officers, directors, 
                employees, and agents from and against any claims, damages, obligations, losses, 
                liabilities, costs, or debt, and expenses (including attorney's fees) arising from 
                your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to the Service immediately, without 
                prior notice or liability, for any reason whatsoever, including without limitation if 
                you breach the Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be interpreted and governed by the laws of the United Arab Emirates, 
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> omeirbestdoc@gmail.com<br/>
                  <strong>Website:</strong> https://schedule.n8nbdoc.com/
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                If a revision is material, we will try to provide at least 30 days notice prior to any new 
                terms taking effect.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
