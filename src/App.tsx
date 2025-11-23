import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Wallets from "./pages/Wallets";
import Assets from "./pages/Assets";
import Operations from "./pages/Operations";
import Rebalance from "./pages/Rebalance";
import Expenses from "./pages/Expenses";
import Dividends from "./pages/Dividends";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/wallets"
              element={
                <Layout>
                  <Wallets />
                </Layout>
              }
            />
            <Route
              path="/wallets/:walletId/assets"
              element={
                <Layout>
                  <Assets />
                </Layout>
              }
            />
            <Route
              path="/operations"
              element={
                <Layout>
                  <Operations />
                </Layout>
              }
            />
            <Route
              path="/rebalance"
              element={
                <Layout>
                  <Rebalance />
                </Layout>
              }
            />
            <Route
              path="/expenses"
              element={
                <Layout>
                  <Expenses />
                </Layout>
              }
            />
            <Route
              path="/dividends"
              element={
                <Layout>
                  <Dividends />
                </Layout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
