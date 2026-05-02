import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { DialogProvider } from '@/components/ui/Dialog';
import KeyboardShortcutsRoot, {
  KeyboardShortcutsProvider,
} from '@/components/KeyboardShortcuts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Leadflow',
  description: 'Personal lead generation pipeline',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            <DialogProvider>
              <KeyboardShortcutsProvider>
                <div className="flex flex-col md:flex-row">
                  <Sidebar />
                  <main className="flex-1 min-h-screen min-w-0">{children}</main>
                </div>
                <KeyboardShortcutsRoot />
              </KeyboardShortcutsProvider>
            </DialogProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
