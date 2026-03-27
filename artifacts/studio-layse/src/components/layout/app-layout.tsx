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
  Moon,
  Sun,
  Scissors,
  Menu,
  X,
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

const mobileBottomNav = [
  { name: 'Agenda',     href: '/',           icon: CalendarDays },
  { name: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { name: 'Clientes',   href: '/clientes',   icon: Users },
  { name: 'Financeiro', href: '/financeiro', icon: Wallet },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top Header (all screen sizes) ── */}
      <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 h-14 bg-card/95 backdrop-blur-md border-b border-border z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center shadow-sm shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">Studio Layse</span>
        </div>

        {/* Desktop nav links in header */}
        <nav className="hidden md:flex items-center gap-1">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-muted-foreground"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ── Mobile Drawer Menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-64 bg-card border-l border-border shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center">
                    <Scissors className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-bold text-sm text-foreground">Studio Layse</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setMenuOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {/* Nav links */}
              <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
                {navigation.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation ── */}
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
      <main className="flex-1">
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
