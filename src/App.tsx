import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
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
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/plan-generation" element={<PlanGeneration />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/training" element={<Training />} />
          <Route path="/vision" element={<VisionAnalysis />} />
          <Route path="/adaptation" element={<Adaptation />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
