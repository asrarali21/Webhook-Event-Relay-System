import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Dashboard from '@/pages/Dashboard';
import DeliveryLogs from '@/pages/DeliveryLogs';
import Subscriptions from '@/pages/Subscriptions';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/logs" element={<DeliveryLogs />} />
            </Routes>
          </main>
        </div>
      </div>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'white',
            color: 'black',
            border: '1px solid #e2e8f0',
          },
        }}
      />
    </Router>
  );
}

export default App;
