import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  Receipt, 
  DollarSign,
  History,
  LogOut,
  Menu,
  X,
  Bell,
  Target,
  Trophy,
  FileText
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/auth') {
      navigate('/auth');
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/wallets', icon: Wallet, label: 'Carteiras' },
    { to: '/operations', icon: History, label: 'Operações' },
    { to: '/rebalance', icon: TrendingUp, label: 'Rebalanceamento' },
    { to: '/dividends', icon: DollarSign, label: 'Dividendos' },
    { to: '/expenses', icon: Receipt, label: 'Despesas' },
    { to: '/alerts', icon: Bell, label: 'Alertas' },
    { to: '/goals', icon: Target, label: 'Metas' },
    { to: '/achievements', icon: Trophy, label: 'Conquistas' },
    { to: '/tax-report', icon: FileText, label: 'Relatório IR' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              FinanceFlow
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Premium Financial Manager</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="pt-6 border-t border-sidebar-border space-y-4">
            <div className="px-4">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground">Conta Premium</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={signOut}
            >
              <LogOut size={16} className="mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
