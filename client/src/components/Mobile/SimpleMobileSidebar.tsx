import { useEffect } from 'react';
import { Link, useLocation } from "wouter";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { X, LogOut } from "lucide-react";
import { navigation } from "@/components/Layout/Sidebar";

interface SimpleMobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function SimpleMobileSidebar({ open, onClose }: SimpleMobileSidebarProps) {
  const [location] = useLocation();
  const user = authService.getUser();

  // Close sidebar when clicking outside or pressing escape
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      // Don't close if clicking inside sidebar or hamburger menu
      if (target?.closest('[data-sidebar]') || target?.closest('[data-hamburger]')) return;
      onClose();
    };

    // Add a small delay to avoid immediate closing when opening
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(user?.role || '')
  );

  const handleLinkClick = () => onClose();

  const handleLogout = async () => {
    await authService.logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      {/* Sidebar */}
      <div 
        data-sidebar 
        className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-background border-r shadow-2xl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-furnili-brown rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <div>
                <h2 className="font-semibold text-furnili-brown">Furnili</h2>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-furnili-brown/10 rounded-full flex items-center justify-center">
                  <span className="text-furnili-brown font-semibold">
                    {user.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{user.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 p-2 overflow-y-auto">
            <nav className="space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location === item.href;
                
                if (item.isCollapsible && item.subItems) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                        {item.name}
                      </div>
                      {item.subItems
                        .filter(subItem => !subItem.roles || subItem.roles.includes(user?.role || ''))
                        .map((subItem) => {
                          const isSubActive = location === subItem.href;
                          return (
                            <Link key={subItem.href} href={subItem.href || '#'}>
                              <Button
                                variant={isSubActive ? "secondary" : "ghost"}
                                className={`w-full justify-start pl-6 h-10 text-sm ${
                                  isSubActive ? 'bg-furnili-brown/10 text-furnili-brown' : ''
                                }`}
                                onClick={handleLinkClick}
                              >
                                <subItem.icon className="h-4 w-4 mr-3" />
                                {subItem.name}
                              </Button>
                            </Link>
                          );
                        })}
                    </div>
                  );
                }

                return (
                  <Link key={item.href} href={item.href || '#'}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start h-11 text-sm ${
                        isActive ? 'bg-furnili-brown/10 text-furnili-brown' : ''
                      }`}
                      onClick={handleLinkClick}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}