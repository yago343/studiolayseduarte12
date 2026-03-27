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
  { name: 'Agenda', href: '/', icon: CalendarDays },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Serviços', href: '/servicos', icon: Sparkles },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Financeiro', href: '/financeiro', icon: Wallet },
  { name: 'Horários', href: '/horarios', icon: Clock },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

const mobileNav = navigation.slice(0, 5);

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
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 z-20 border-r border-border bg-card shadow-sm">
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-primary/30">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-foreground leading-none block">Studio Layse</span>
              <span className="text-xs text-muted-foreground">Duarte</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-none">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative
                  ${active
                    ? 'text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }
                `}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 gradient-brand rounded-xl shadow-md shadow-primary/30"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <item.icon className={`w-[18px] h-[18px] shrink-0 relative z-10 transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`} />
                <span className="relative z-10 text-sm">{item.name}</span>
                {active && (
                  <div className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full bg-white/60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 pb-5 space-y-1">
          <div className="mx-2 h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200 text-sm"
          >
            {isDarkMode
              ? <Sun className="w-[18px] h-[18px]" />
              : <Moon className="w-[18px] h-[18px]" />
            }
            {isDarkMode ? "Modo Claro" : "Modo Escuro"}
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between px-4 h-14 bg-card/95 backdrop-blur-md border-b border-border z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-primary/30">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none">
            <span className="font-bold text-sm text-foreground">Studio Layse</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ── Mobile Full Menu (slide from right) ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 28, stiffness: 250 }}
              className="fixed inset-y-0 right-0 w-72 bg-card border-l border-border z-50 flex flex-col md:hidden shadow-2xl"
            >
              {/* Menu header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-primary/30">
                    <Scissors className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Studio Layse</div>
                    <div className="text-xs text-muted-foreground">Duarte</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 relative
                        ${active
                          ? 'text-primary-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                        }
                      `}
                    >
                      {active && (
                        <div className="absolute inset-0 gradient-brand rounded-xl shadow-md shadow-primary/20" />
                      )}
                      <item.icon className="w-5 h-5 shrink-0 relative z-10" />
                      <span className="relative z-10">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-30 px-2 py-1 safe-area-pb">
        <div className="flex justify-around items-center">
          {mobileNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[52px] relative
                  ${active ? 'text-primary' : 'text-muted-foreground'}
                `}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.35 }}
                  />
                )}
                <item.icon className={`w-5 h-5 relative z-10 transition-all duration-200 ${active ? 'scale-110' : ''}`} />
                <span className={`text-[10px] font-medium relative z-10 ${active ? 'font-semibold' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[52px] text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 md:ml-64 min-h-screen">
        <div className="pt-14 md:pt-0 pb-20 md:pb-0 px-4 md:px-8 py-4 md:py-8 max-w-7xl mx-auto w-full">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
