import React from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Patients', href: '/patients', icon: '👥' },
    { name: 'Staff', href: '/staff', icon: '👨‍⚕️' },
    { name: 'Appointments', href: '/appointments', icon: '📅' },
    { name: 'Payments', href: '/payments', icon: '💰' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-16 bg-blue-600">
          <h2 className="text-white text-lg font-semibold">MediCare</h2>
        </div>

        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
