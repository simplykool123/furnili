import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, Package, FileText, Users, DollarSign, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "./MobileOptimizer";

interface MobileNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const navigationItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: FileText, label: "Requests", href: "/requests" },
  { icon: Users, label: "Staff", href: "/attendance" },
  { icon: DollarSign, label: "Petty Cash", href: "/petty-cash" },
  { icon: BarChart3, label: "Reports", href: "/whatsapp-export" },
];

export default function MobileNavigation({ isOpen, onToggle, onClose }: MobileNavigationProps) {
  const { isMobile } = useIsMobile();
  const [location] = useLocation();

  if (!isMobile) return null;

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-border lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="touch-target"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-lg font-semibold text-amber-900">Furnili MS</h1>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 animate-fade-in" 
            onClick={onClose}
          />
          
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl animate-slide-up">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-700">F</span>
                  </div>
                  <h2 className="text-lg font-semibold text-amber-900">Furnili MS</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="touch-target"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-2 px-3">
                  {navigationItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <a
                          onClick={onClose}
                          className={cn(
                            "flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 touch-target",
                            isActive
                              ? "bg-amber-100 text-amber-900 shadow-sm"
                              : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                          )}
                        >
                          <item.icon className={cn(
                            "w-5 h-5 flex-shrink-0",
                            isActive ? "text-amber-600" : "text-gray-500"
                          )} />
                          <span>{item.label}</span>
                        </a>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Footer */}
              <div className="border-t border-border p-4">
                <div className="text-xs text-gray-500 text-center">
                  Furnili Management System
                  <br />
                  Version 2.0
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Bottom Navigation Bar for Mobile
export function MobileBottomNav() {
  const { isMobile } = useIsMobile();
  const [location] = useLocation();

  if (!isMobile) return null;

  const quickActions = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Package, label: "Products", href: "/products" },
    { icon: FileText, label: "Requests", href: "/requests" },
    { icon: DollarSign, label: "Cash", href: "/petty-cash" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border mobile-safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around py-2">
        {quickActions.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 touch-target min-w-[64px]",
                  isActive
                    ? "text-amber-600"
                    : "text-gray-500 active:text-amber-500"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}