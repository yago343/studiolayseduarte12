import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Sparkles, 
  Users, 
  Wallet, 
  Clock, 
  Settings, 
  Menu,
  X,
  Moon,
  Sun,
  Scissors
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: 'Agenda',        href: '/',              icon: CalendarDays },
  { name: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
  { name: 'Serviços',      href: '/servicos',      icon: Sparkles },
  { name: 'Clientes',      href: '/clientes',      icon: Users },
  { name: 'Financeiro',    href: '/financeiro',    icon: Wallet },
  { name: 'Horários',      href: '/horarios',      icon: Clock },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

// Bottom bar: Dashboard, Agenda, Clientes, Financeiro only
const mobileBottomNav = [
  { name: 'Agenda',     href: '/',           icon: CalendarDays },
  { name: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { name: 'Clientes',   href: '/clientes',   icon: Users },
  { name: 'Financeiro', href: '/financeiro', icon: Wallet },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || 
                   localStorage.theme === 'dark';
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = 'light';
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Desktop Sidebar (dark) ── */}
      <aside className="hidden md:flex flex-col w-60 fixed inset-y-0 z-20 sidebar-gradient">
        
        {/* Logo area */}
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-lg shadow-black/30 shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none">
            <span className="font-bold text-sm text-white block">Studio Layse</span>
            <span className="text-[11px] text-white/45">Duarte</span>
          </div>
        </div>

        <div className="mx-4 h-px bg-white/8 mb-2" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto scrollbar-none">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm
                  ${active
                    ? 'text-white font-medium'
                    : 'text-white/50 hover:text-white/85 hover:bg-white/6'
                  }
                `}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-bg"
                    className="absolute inset-0 bg-white/10 rounded-xl border border-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                {active && (
                  <div className="absolute left-0 inset-y-2 w-0.5 bg-primary rounded-full" />
                )}
                <item.icon className="w-[17px] h-[17px] shrink-0 relative z-10" />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-5 pt-2 space-y-0.5">
          <div className="mx-1 h-px bg-white/8 mb-3" />
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white/85 hover:bg-white/6 transition-all text-sm"
          >
            {isDarkMode ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
            {isDarkMode ? "Modo Claro" : "Modo Escuro"}
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between px-4 h-14 bg-card/95 backdrop-blur-md border-b border-border z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center shadow-sm shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">Studio Layse</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ── Mobile Drawer Menu ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 right-0 w-64 z-50 flex flex-col md:hidden sidebar-gradient shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center shadow-sm">
                    <Scissors className="w-4 h-4 text-white" />
                  </div>
                  <div className="leading-none">
                    <div className="font-bold text-sm text-white">Studio Layse</div>
                    <div className="text-[11px] text-white/45">Duarte</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {navigation.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 text-sm
                        ${active
                          ? 'text-white font-medium bg-white/10 border border-white/10'
                          : 'text-white/50 hover:text-white/85 hover:bg-white/6'
                        }
                      `}
                    >
                      {active && (
                        <div className="absolute left-0 inset-y-2.5 w-0.5 bg-primary rounded-full" />
                      )}
                      <item.icon className="w-[17px] h-[17px] shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation (4 items only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-30">
        <div className="flex items-stretch h-14">
          {mobileBottomNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors
                  ${active ? 'text-primary' : 'text-muted-foreground'}
                `}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-pill"
                    className="absolute top-0 left-3 right-3 h-[2px] bg-primary rounded-full"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.35 }}
                  />
                )}
                <item.icon className={`w-[22px] h-[22px] transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium leading-none mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 md:ml-60">
        <div className="pt-16 pb-16 px-3 md:pt-7 md:pb-7 md:px-7 max-w-7xl mx-auto w-full overflow-x-hidden">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
