import { Bell, Settings, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Header() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 shadow-sm">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">WM</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Webhook Management</h2>
            <p className="text-sm text-slate-500">Real-time monitoring dashboard</p>
          </div>
        </div>
      </div>
      
    </header>
  );
}
