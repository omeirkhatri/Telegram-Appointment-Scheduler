import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            © 2024 Best DOC. All rights reserved.
          </div>
          <div className="text-sm text-gray-500">
            MediCare Scheduler v1.0.0
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
