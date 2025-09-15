import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Inspections from "@/pages/inspections";
import Equipment from "@/pages/equipment";
import Buildings from "@/pages/buildings";
import Compliance from "@/pages/compliance";
import Reports from "@/pages/reports";
import Documents from "@/pages/documents";
import Inspectors from "@/pages/inspectors";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/inspections" component={Inspections} />
      <ProtectedRoute path="/equipment" component={Equipment} />
      <ProtectedRoute path="/buildings" component={Buildings} />
      <ProtectedRoute path="/compliance" component={Compliance} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/documents" component={Documents} />
      <ProtectedRoute path="/inspectors" component={Inspectors} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
