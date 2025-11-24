// src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Clock,
  ChefHat,
  ShoppingCart,
  LayoutDashboard,
  Bot,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: 'يومي (My Day)', href: '/dashboard', icon: LayoutDashboard },
  { name: 'مواقيت الصلاة (Muwaqqit)', href: '/muwaqqit', icon: Clock },
  { name: 'الطبخ الذكي (Chef)', href: '/cooking', icon: ChefHat },
  { name: 'قائمتي (Shopping)', href: '/shopping', icon: ShoppingCart },
  { name: 'المساعد (Assistant)', href: '/assistant', icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 right-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-64 bg-white border-l border-slate-200 shadow-sm transition-transform duration-300 ease-in-out transform md:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex items-center justify-center">
             <h1 className="text-2xl font-bold text-primary">منصّتي الذكية</h1>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
             <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">حالة النظام</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-sm font-semibold text-slate-700">متصل (Online)</span>
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
