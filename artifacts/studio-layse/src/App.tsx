import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";

// Pages
import Dashboard from "./pages/dashboard";
import CalendarPage from "./pages/calendar";
import ServicesPage from "./pages/services";
import ClientsPage from "./pages/clients";
import FinancesPage from "./pages/finances";
import SchedulePage from "./pages/schedule";
import SettingsPage from "./pages/settings";
import PublicBooking from "./pages/public-booking";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public Route - No Sidebar */}
      <Route path="/agendar" component={PublicBooking} />
      
      {/* Internal Routes - With Sidebar */}
      <Route path="/">
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
      
      {/* Fallback */}
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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
