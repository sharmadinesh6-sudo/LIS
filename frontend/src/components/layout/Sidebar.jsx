import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  TestTube,
  ClipboardList,
  FileText,
  Activity,
  FileCheck,
  Package,
  ScrollText,
  LogOut
} from 'lucide-react';

export const Sidebar = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Patients', href: '/patients', icon: Users },
    { name: 'Samples', href: '/samples', icon: TestTube },
    { name: 'Test Configuration', href: '/tests', icon: ClipboardList },
    { name: 'Results', href: '/results', icon: FileText },
    { name: 'Quality Control', href: '/qc', icon: Activity },
    { name: 'NABL Documents', href: '/nabl-documents', icon: FileCheck },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Audit Logs', href: '/audit-logs', icon: ScrollText },
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
            LIMS Pro
          </h1>
          <p className="text-slate-400 text-xs mt-1">NABL Compliant</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={
                  isActive
                    ? 'flex items-center px-6 py-3 text-white bg-slate-800 border-l-4 border-sky-500'
                    : 'flex items-center px-6 py-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors'
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-3">
            <p className="text-white text-sm font-medium">{user?.name}</p>
            <p className="text-slate-400 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
            data-testid="logout-button"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
};