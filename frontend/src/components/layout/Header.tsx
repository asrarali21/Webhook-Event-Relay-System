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
      
      <div className="flex items-center space-x-4">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search webhooks..." 
            className="pl-10 w-64 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="relative hover:bg-slate-100">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-slate-100">
            <Settings className="h-5 w-5 text-slate-600" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-slate-100">
            <User className="h-5 w-5 text-slate-600" />
          </Button>
        </div>
      </div>
    </header>
  );
}
