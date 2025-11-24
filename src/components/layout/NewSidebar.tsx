'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useUnassignedSegmentsCount } from '@/hooks/useUnassignedSegmentsCount';
import { useRoleFilteringEnabled, useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils/cn';
import { getUserNavigationItems } from '@/utils/navigation';
import { Activity, ChevronLeft, ChevronRight, Menu, UserCircle, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function NewSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const userRole = useUserRole();
  const enableRoleFiltering = useRoleFilteringEnabled();
  const { count: unassignedCount } = useUnassignedSegmentsCount();

  // Load collapse state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Save collapse state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', newState.toString());
  };

  // Get navigation items filtered by role
  const navigationItems = getUserNavigationItems(userRole, enableRoleFiltering);

  // Add badge count to capacity planner
  const itemsWithBadges = navigationItems.map(item => {
    if (item.id === 'capacity-planner' && unassignedCount > 0) {
      return { ...item, badge: unassignedCount };
    }
    return item;
  });

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Logo/Brand Section */}
      <div className={cn(
        'flex items-center border-b border-[--border] transition-all duration-300',
        mobile ? 'h-16 px-4' : isCollapsed ? 'h-16 justify-center px-2' : 'h-16 px-6'
      )}>
        <Link href="/" className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[--primary]">
            <Activity className="h-6 w-6 text-[--primary-foreground]" />
          </div>
          {(!isCollapsed || mobile) && (
            <span className="text-xl font-bold text-[--foreground]">
              MediCare
            </span>
          )}
        </Link>

        {/* Collapse Toggle Button - Desktop Only */}
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'ml-auto h-8 w-8 transition-all duration-300',
              isCollapsed ? 'mx-auto' : ''
            )}
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}

        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {itemsWithBadges.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => mobile && setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-[--primary] text-[--primary-foreground] shadow-md'
                      : 'text-[--muted-foreground] hover:bg-[--accent] hover:text-[--accent-foreground]',
                    isCollapsed && !mobile && 'justify-center',
                  )}
                  title={isCollapsed && !mobile ? item.label : undefined}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', !isCollapsed || mobile ? 'mr-3' : '')} />
                  {(!isCollapsed || mobile) && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant="destructive"
                          className="ml-2 h-5 min-w-[20px] justify-center px-1.5 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {isCollapsed && !mobile && item.badge && (
                    <Badge
                      variant="destructive"
                      className="absolute right-1 top-1 h-4 w-4 rounded-full p-0 text-[10px]"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      {/* User Section */}
      <div className={cn(
        'border-t border-[--border] p-4',
        isCollapsed && !mobile && 'flex justify-center p-2'
      )}>
        <div className={cn(
          'flex items-center',
          isCollapsed && !mobile && 'flex-col'
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[--muted]">
            <UserCircle className="h-6 w-6 text-[--muted-foreground]" />
          </div>
          {(!isCollapsed || mobile) && (
            <div className="ml-3 min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[--foreground]">
                Admin User
              </p>
              <p className="truncate text-xs text-[--muted-foreground]">
                admin@medicare.com
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-40 lg:hidden"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <NavContent mobile />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-[--border] bg-[--card] transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
