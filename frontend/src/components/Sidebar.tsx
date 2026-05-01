'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Send, MessageSquareText, Ban, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';

const items = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/outreach', label: 'Outreach', icon: Send },
  { href: '/templates', label: 'Templates', icon: MessageSquareText },
  { href: '/blacklist', label: 'Blacklist', icon: Ban },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r min-h-screen p-4 hidden md:block">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-semibold tracking-tight">Leadflow</h1>
        <p className="text-xs text-muted-fg">Personal lead pipeline</p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition',
                active ? 'bg-muted font-medium' : 'text-muted-fg hover:bg-muted hover:text-fg',
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
