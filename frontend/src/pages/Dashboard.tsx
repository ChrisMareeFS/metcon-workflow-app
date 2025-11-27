import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Package, GitBranch, BarChart3, Upload, TrendingUp, Clock, AlertCircle, CheckCircle, PlayCircle } from 'lucide-react';
import api from '../services/api';

interface DashboardStats {
  active_batches: number;
  active_batches_change: number;
  pending_approvals: number;
  flagged_batches: number;
  completed_today: number;
  completed_change_percent: string;
  avg_processing_hours: number;
  processing_time_change: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/analytics/dashboard-stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      // Set default values on error
      setStats({
        active_batches: 0,
        active_batches_change: 0,
        pending_approvals: 0,
        flagged_batches: 0,
        completed_today: 0,
        completed_change_percent: '0',
        avg_processing_hours: 0,
        processing_time_change: '0',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format stats for display
  const displayStats = stats ? [
    {
      label: 'Active Batches',
      value: String(stats.active_batches),
      icon: Package,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      change: stats.active_batches_change !== 0
        ? `${stats.active_batches_change > 0 ? '+' : ''}${stats.active_batches_change} from yesterday`
        : 'No change from yesterday',
      trend: stats.active_batches_change > 0 ? 'up' : stats.active_batches_change < 0 ? 'down' : 'neutral',
    },
    {
      label: 'Pending Approvals',
      value: String(stats.pending_approvals),
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      change: stats.flagged_batches > 0
        ? `${stats.flagged_batches} require attention`
        : 'All clear',
      trend: 'neutral',
    },
    {
      label: 'Completed Today',
      value: String(stats.completed_today),
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      change: stats.completed_change_percent !== '0'
        ? `${parseFloat(stats.completed_change_percent) > 0 ? '+' : ''}${stats.completed_change_percent}% vs yesterday`
        : 'No batches completed yesterday',
      trend: parseFloat(stats.completed_change_percent) > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Avg Processing Time',
      value: `${stats.avg_processing_hours.toFixed(1)}h`,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      change: stats.processing_time_change !== '0'
        ? `${parseFloat(stats.processing_time_change) < 0 ? '' : '+'}${stats.processing_time_change}h ${parseFloat(stats.processing_time_change) < 0 ? 'improvement' : 'increase'}`
        : 'No change',
      trend: parseFloat(stats.processing_time_change) < 0 ? 'up' : parseFloat(stats.processing_time_change) > 0 ? 'down' : 'neutral',
    },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header Section */}
            <div>
        <h1 className="text-3xl font-semibold text-red-600">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.username}</p>
      </div>

        {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-gray-200 w-12 h-12"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-40"></div>
              </div>
            ))
          ) : displayStats.length > 0 ? (
            displayStats.map((stat) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-white rounded-xl p-6 border border-gray-200"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-lg ${stat.bg}`}>
                      <IconComponent className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-900">{stat.value}</h3>
                  <p className="text-sm text-gray-600 mt-2">{stat.label}</p>
                  <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
                </div>
              );
            })
          ) : (
            <div className="col-span-4 text-center py-8 text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Start New Batch - Primary Action */}
          <button
            onClick={() => navigate('/batches/scan')}
            className="bg-green-500 hover:bg-green-600 text-white rounded-2xl p-8 text-left transition-all"
          >
            <PlayCircle className="h-10 w-10 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start New Batch</h3>
            <p className="text-green-50 text-sm leading-relaxed">
                Begin a new batch with OCR scanning or manual entry
              </p>
          </button>

          <button
            onClick={() => navigate('/flows')}
            className="bg-white hover:shadow-lg rounded-2xl p-8 text-left transition-all border border-gray-200"
          >
            <GitBranch className="h-10 w-10 text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Production Flows</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              View and manage production workflows
            </p>
          </button>

          <button
            onClick={() => navigate('/batches/wip')}
            className="bg-white hover:shadow-lg rounded-2xl p-8 text-left transition-all border border-gray-200"
          >
            <Package className="h-10 w-10 text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Active Batches</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Track batches through production stations
              </p>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="bg-white hover:shadow-lg rounded-2xl p-8 text-left transition-all border border-gray-200"
          >
            <BarChart3 className="h-10 w-10 text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              View performance metrics and reports
              </p>
          </button>

            {(user?.role === 'operator' || user?.role === 'admin') && (
            <button
              onClick={() => navigate('/production-plans/upload')}
              className="bg-white hover:shadow-lg rounded-2xl p-8 text-left transition-all border border-gray-200"
            >
              <Upload className="h-10 w-10 text-gray-700 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Production Plans</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Upload and process production forms
              </p>
            </button>
          )}

          <button
            onClick={() => navigate('/analytics')}
            className="bg-white hover:shadow-lg rounded-2xl p-8 text-left transition-all border border-gray-200"
          >
            <TrendingUp className="h-10 w-10 text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Performance Trends</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Historical data and insights
            </p>
          </button>
        </div>
      </div>

    </div>
  );
}
