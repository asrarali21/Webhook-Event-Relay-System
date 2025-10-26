import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Webhook, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { apiService, type SystemStats, type DeliveryLog } from '@/services/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [statsData, logsData] = await Promise.all([
        apiService.getStats(),
        apiService.getDeliveryLogs({ limit: 5 })
      ]);
      setStats(statsData);
      setRecentLogs(logsData.logs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Delivered successfully';
      case 'failed': return 'Delivery failed';
      case 'pending': return 'Delivery pending';
      default: return 'Unknown status';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="space-y-6 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96"></div>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Loading dashboard data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="space-y-8 p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Monitor your webhook event relay system
            </p>
          </div>
          <Button 
            onClick={fetchData} 
            disabled={refreshing}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Total Events</CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white group-hover:scale-110 transition-transform duration-200">
                <Activity className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {stats?.events.total.toLocaleString() || '0'}
              </div>
              <p className="text-sm text-slate-500">
                All time events received
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Active Subscriptions</CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white group-hover:scale-110 transition-transform duration-200">
                <Webhook className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {stats?.subscriptions.active || '0'}
              </div>
              <p className="text-sm text-slate-500">
                {stats?.subscriptions.total || '0'} total subscriptions
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Success Rate</CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white group-hover:scale-110 transition-transform duration-200">
                <CheckCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {stats?.deliveries.successRate.toFixed(1) || '0'}%
              </div>
              <p className="text-sm text-slate-500">
                {stats?.deliveries.successful || '0'} successful deliveries
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Failed Deliveries</CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white group-hover:scale-110 transition-transform duration-200">
                <FileText className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {stats?.deliveries.failed || '0'}
              </div>
              <p className="text-sm text-slate-500">
                {stats?.deliveries.pending || '0'} pending deliveries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                Recent Activity
              </CardTitle>
              <CardDescription className="text-slate-600">
                Latest webhook deliveries and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center space-x-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-200">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(log.status)} shadow-sm`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {getStatusText(log.status)} - {log.event.event_type}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {log.subscription.target_url} • {formatTimeAgo(log.attemptedAt)}
                        </p>
                      </div>
                      {log.responseStatusCode && (
                        <div className="text-xs font-mono bg-slate-200 px-2 py-1 rounded">
                          {log.responseStatusCode}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                      <Activity className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">No recent activity</p>
                    <p className="text-sm text-slate-400">Activity will appear here as events are processed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                System Health
              </CardTitle>
              <CardDescription className="text-slate-600">
                Current system status and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <span className="text-sm font-semibold text-slate-700">API Status</span>
                  <span className="text-sm font-bold text-green-600 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <span className="text-sm font-semibold text-slate-700">Queue Status</span>
                  <span className="text-sm font-bold text-green-600 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Running
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <span className="text-sm font-semibold text-slate-700">Total Deliveries</span>
                  <span className="text-sm font-bold text-slate-900">{stats?.deliveries.total || '0'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <span className="text-sm font-semibold text-slate-700">Queue Size</span>
                  <span className="text-sm font-bold text-slate-900">{stats?.queue.pending || '0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
