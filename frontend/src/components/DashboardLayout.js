import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  FileText, 
  Users, 
  Wallet, 
  CalendarCheck, 
  BarChart3,
  Settings,
  LogOut,
  History,
  ShoppingCart,
  UserCog,
  RotateCcw
} from 'lucide-react';

const allNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: null }, // Everyone can view dashboard
  { path: '/inventory', icon: Package, label: 'Inventory', permission: 'inventory.view' },
  { path: '/jobcards', icon: ClipboardList, label: 'Job Cards', permission: 'jobcards.view' },
  { path: '/invoices', icon: FileText, label: 'Invoices', permission: 'invoices.view' },
  { path: '/parties', icon: Users, label: 'Parties', permission: 'parties.view' },
  { path: '/purchases', icon: ShoppingCart, label: 'Purchases', permission: 'purchases.view' },
  { path: '/returns', icon: RotateCcw, label: 'Returns', permission: 'returns.view' },
  { path: '/finance', icon: Wallet, label: 'Finance', permission: 'finance.view' },
  { path: '/daily-closing', icon: CalendarCheck, label: 'Daily Closing', permission: 'finance.view' },
  { path: '/reports', icon: BarChart3, label: 'Reports', permission: 'reports.view' },
  { path: '/audit-logs', icon: History, label: 'Audit Logs', permission: 'audit.view' },
  { path: '/workers', icon: UserCog, label: 'Workers', permission: null }, // Everyone can access workers
  { path: '/settings', icon: Settings, label: 'Settings', permission: null } // Everyone can access settings
];

export const DashboardLayout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();

  // Filter navigation items based on user permissions
  const navItems = useMemo(() => {
    if (!user) return [];
    
    return allNavItems.filter(item => {
      // If no permission required, show to everyone
      if (!item.permission) return true;
      
      // Check if user has the required permission
      return hasPermission(item.permission);
    });
  }, [user, hasPermission]);

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-primary text-primary-foreground flex flex-col">
        <div className="p-6 border-b border-primary-hover">
          <h1 className="text-2xl font-serif font-semibold">Gold Shop ERP</h1>
          <p className="text-xs mt-1 opacity-80 font-mono">The Artisan Ledger</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                  isActive
                    ? 'bg-accent text-accent-foreground shadow-md'
                    : 'hover:bg-primary-hover'
                }`
              }
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-hover">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name}</div>
              <div className="text-xs opacity-70 uppercase font-mono">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="logout-button"
            className="w-full flex items-center gap-3 px-4 py-2 rounded-md hover:bg-primary-hover transition-all text-sm"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
