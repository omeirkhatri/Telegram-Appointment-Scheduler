'use client';

import { TimeDisplay } from '@/components/ui/TimeDisplay';
import {
    Activity,
    CalendarDays,
    Menu,
    Settings,
    Sun,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderProps {
  title?: string;
  currentPage?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'MediCare Scheduler', currentPage = 'dashboard' }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize dark mode on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check localStorage first, then system preference
      const savedDarkMode = localStorage.getItem('darkMode');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      let shouldBeDark = false;

      if (savedDarkMode !== null) {
        // Use saved preference
        shouldBeDark = savedDarkMode === 'true';
      } else {
        // Use system preference
        shouldBeDark = systemPrefersDark;
      }

      // Apply the dark mode state
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      }
    }
  }, []);

  // Navigation items
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Activity, active: currentPage === 'dashboard' },
    { name: 'Patients', href: '/patients', icon: Users, active: currentPage === 'patients' },
    { name: 'Staff', href: '/staff', icon: UserCheck, active: currentPage === 'staff' },
    { name: 'Appointments', href: '/appointments', icon: CalendarDays, active: currentPage === 'appointments' },
    { name: 'Settings', href: '/settings', icon: Settings, active: currentPage === 'settings' },
  ];

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    // Apply to DOM
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Store preference in localStorage
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  return (
    <header className="bg-[--card] border-b border-[--border] sticky top-0 z-50">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between h-16 px-8">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[--primary] rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-[--primary-foreground]" />
            </div>
            <h1 className="text-xl font-bold text-[--foreground]">{title}</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${item.active
                      ? 'bg-[--primary] text-[--primary-foreground] shadow-lg'
                      : 'text-[--muted-foreground] hover:bg-[--accent] hover:text-[--accent-foreground]'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          <TimeDisplay />
          <button
            onClick={toggleDarkMode}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Sun className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 bg-[--muted] rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-[--muted-foreground]" />
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[--primary] rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-[--primary-foreground]" />
          </div>
          <h1 className="text-lg font-semibold text-[--foreground]">MediCare</h1>
        </div>

        <div className="flex items-center space-x-2">
          <TimeDisplay className="hidden sm:flex" />
          <button
            onClick={toggleDarkMode}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-64 bg-[--card] border-l border-[--border] transform transition-transform duration-300">
            <div className="flex items-center justify-between h-16 px-4 border-b border-[--border]">
              <h2 className="text-lg font-semibold text-[--foreground]">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4">
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className={`
                          flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                          ${item.active
                            ? 'bg-[--primary] text-[--primary-foreground] shadow-lg'
                            : 'text-[--muted-foreground] hover:bg-[--accent] hover:text-[--accent-foreground]'
                          }
                        `}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
