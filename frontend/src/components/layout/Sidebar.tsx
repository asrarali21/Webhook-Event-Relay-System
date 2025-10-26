// Sidebar layout component
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  Webhook,
  Zap
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'from-blue-500 to-indigo-500' },
  { name: 'Subscriptions', href: '/subscriptions', icon: Webhook, color: 'from-green-500 to-emerald-500' },
  { name: 'Delivery Logs', href: '/logs', icon: FileText, color: 'from-purple-500 to-violet-500' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-72 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 shadow-2xl">
      {/* Logo Section */}
      <div className="flex h-20 items-center px-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <span className="text-xl font-bold text-white">AlgoHire</span>
            <p className="text-xs text-slate-400">Webhook Relay</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 py-6">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105',
                isActive
                  ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg mr-3 transition-all duration-200',
                isActive 
                  ? 'bg-white/20' 
                  : 'bg-slate-700/50 group-hover:bg-slate-600/50'
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="font-semibold">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-slate-300">System Online</span>
        </div>
      </div>
    </div>
  );
}

