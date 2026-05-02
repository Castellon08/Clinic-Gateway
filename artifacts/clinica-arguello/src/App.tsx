import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import { useEffect } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import PatientsPage from "@/pages/patients/index";
import NewPatientPage from "@/pages/patients/new";
import PatientDetailPage from "@/pages/patients/[id]";
import AppointmentsPage from "@/pages/appointments/index";
import NewAppointmentPage from "@/pages/appointments/new";
import ClinicalRecordsPage from "@/pages/clinical-records/index";
import NewClinicalRecordPage from "@/pages/clinical-records/new";
import InvoicesPage from "@/pages/invoices/index";
import NewInvoicePage from "@/pages/invoices/new";
import InventoryPage from "@/pages/inventory/index";
import NewInventoryItemPage from "@/pages/inventory/new";
import UsersPage from "@/pages/settings/users";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const { data: user, isError, isLoading } = useGetMe();

  useEffect(() => {
    const token = localStorage.getItem("clinica_token");
    if (!token || isError) {
      setLocation("/login");
    }
  }, [isError, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/patients/new" component={() => <ProtectedRoute component={NewPatientPage} />} />
      <Route path="/patients/:id" component={() => <ProtectedRoute component={PatientDetailPage} />} />
      <Route path="/patients" component={() => <ProtectedRoute component={PatientsPage} />} />
      <Route path="/appointments/new" component={() => <ProtectedRoute component={NewAppointmentPage} />} />
      <Route path="/appointments" component={() => <ProtectedRoute component={AppointmentsPage} />} />
      <Route path="/clinical-records/new" component={() => <ProtectedRoute component={NewClinicalRecordPage} />} />
      <Route path="/clinical-records" component={() => <ProtectedRoute component={ClinicalRecordsPage} />} />
      <Route path="/invoices/new" component={() => <ProtectedRoute component={NewInvoicePage} />} />
      <Route path="/invoices" component={() => <ProtectedRoute component={InvoicesPage} />} />
      <Route path="/inventory/new" component={() => <ProtectedRoute component={NewInventoryItemPage} />} />
      <Route path="/inventory" component={() => <ProtectedRoute component={InventoryPage} />} />
      <Route path="/settings/users" component={() => <ProtectedRoute component={UsersPage} />} />
      <Route component={NotFound} />
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
