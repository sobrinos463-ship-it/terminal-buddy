import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import SplashScreen from "./pages/SplashScreen";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import PlanGeneration from "./pages/PlanGeneration";
import Dashboard from "./pages/Dashboard";
import Training from "./pages/Training";
import VisionAnalysis from "./pages/VisionAnalysis";
import Adaptation from "./pages/Adaptation";
import Chat from "./pages/Chat";
import Summary from "./pages/Summary";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/plan-generation" element={
              <ProtectedRoute>
                <PlanGeneration />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/training" element={
              <ProtectedRoute>
                <Training />
              </ProtectedRoute>
            } />
            <Route path="/vision" element={
              <ProtectedRoute>
                <VisionAnalysis />
              </ProtectedRoute>
            } />
            <Route path="/adaptation" element={
              <ProtectedRoute>
                <Adaptation />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="/summary" element={
              <ProtectedRoute>
                <Summary />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
