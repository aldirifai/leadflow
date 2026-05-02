'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Send, MessageSquareText, Ban, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    <aside className="hidden md:flex md:flex-col w-60 min-h-screen border-r border-border bg-card/40 backdrop-blur p-4 sticky top-0">
      <div className="mb-8 px-2 flex items-center gap-2">
        <div className="size-8 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center text-accent-fg">
          <Sparkles size={16} strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight leading-tight">Leadflow</h1>
          <p className="text-[11px] text-muted-fg leading-tight">landingklinik.id</p>
        </div>
      </div>

      <nav className="space-y-0.5 flex-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-muted text-fg font-medium'
                  : 'text-muted-fg hover:bg-muted/60 hover:text-fg',
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-border space-y-3">
        <ThemeToggle />
        <p className="px-1 text-[10px] text-muted-fg leading-relaxed">
          Personal pipeline · capture &rarr; score &rarr; outreach manual
        </p>
      </div>
    </aside>
  );
}
