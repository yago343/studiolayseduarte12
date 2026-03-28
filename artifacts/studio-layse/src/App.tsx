import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

import Dashboard from "./pages/dashboard";
import CalendarPage from "./pages/calendar";
import ServicesPage from "./pages/services";
import ClientsPage from "./pages/clients";
import FinancesPage from "./pages/finances";
import SchedulePage from "./pages/schedule";
import SettingsPage from "./pages/settings";
import PublicBooking from "./pages/public-booking";
import AuthPage from "./pages/auth";
import CompleteProfilePage from "./pages/complete-profile";

const queryClient = new QueryClient();

function ProtectedBooking() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/entrar");
    } else if (!user.phone) {
      navigate("/completar-perfil");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !user.phone) return null;

  return <PublicBooking />;
}

function Router() {
  return (
    <Switch>
      <Route path="/entrar" component={AuthPage} />
      <Route path="/completar-perfil" component={CompleteProfilePage} />
      <Route path="/agendar" component={ProtectedBooking} />

      <Route path="/">
        <AppLayout><CalendarPage /></AppLayout>
      </Route>
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/agenda">
        <AppLayout><CalendarPage /></AppLayout>
      </Route>
      <Route path="/servicos">
        <AppLayout><ServicesPage /></AppLayout>
      </Route>
      <Route path="/clientes">
        <AppLayout><ClientsPage /></AppLayout>
      </Route>
      <Route path="/financeiro">
        <AppLayout><FinancesPage /></AppLayout>
      </Route>
      <Route path="/horarios">
        <AppLayout><SchedulePage /></AppLayout>
      </Route>
      <Route path="/configuracoes">
        <AppLayout><SettingsPage /></AppLayout>
      </Route>

      <Route>
        <AppLayout><NotFound /></AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
