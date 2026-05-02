'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Send,
  MessageSquareText,
  Ban,
  Settings,
  Sparkles,
  Menu,
  X,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';

const items = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/outreach', label: 'Outreach', icon: Send },
  { href: '/templates', label: 'Templates', icon: MessageSquareText },
  { href: '/blacklist', label: 'Blacklist', icon: Ban },
  { href: '/tags', label: 'Tags', icon: Tag },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="size-8 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center text-accent-fg">
        <Sparkles size={16} strokeWidth={2.4} />
      </div>
      <div>
        <h1 className="text-sm font-semibold tracking-tight leading-tight">Leadflow</h1>
        <p className="text-[11px] text-muted-fg leading-tight">landingklinik.id</p>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5 flex-1">
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  );
}

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Close drawer on Esc
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <>
      {/* Desktop sidebar (md+) */}
      <aside className="hidden md:flex md:flex-col w-60 min-h-screen border-r border-border bg-card/40 backdrop-blur p-4 sticky top-0">
        <div className="mb-8 px-2">
          <Brand />
        </div>

        <NavItems />

        <div className="pt-4 border-t border-border space-y-3">
          <ThemeToggle />
          <p className="px-1 text-[10px] text-muted-fg leading-relaxed">
            Personal pipeline · capture &rarr; score &rarr; outreach manual
          </p>
        </div>
      </aside>

      {/* Mobile top bar (<md) */}
      <div className="md:hidden flex h-14 items-center justify-between px-4 border-b border-border bg-card sticky top-0 z-30">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Buka menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="-ml-2"
        >
          <Menu size={18} />
        </Button>
        <Brand />
        <div className="w-[120px] shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile drawer (<md) */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-fg/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          {/* Panel */}
          <aside
            className="fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border flex flex-col p-4 animate-fade-in"
          >
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tutup menu"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>

            <NavItems onNavigate={() => setDrawerOpen(false)} />

            <div className="pt-4 border-t border-border space-y-3">
              <ThemeToggle />
              <p className="px-1 text-[10px] text-muted-fg leading-relaxed">
                Personal pipeline · capture &rarr; score &rarr; outreach manual
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
