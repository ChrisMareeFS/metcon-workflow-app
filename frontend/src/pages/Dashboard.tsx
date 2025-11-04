import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Package, GitBranch, BarChart3, Upload, TrendingUp, Clock, AlertCircle, CheckCircle, Activity, PlayCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Mock stats data
  const stats = [
    {
      label: 'Active Batches',
      value: '12',
      icon: Package,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      change: '+3 from yesterday',
      trend: 'up',
    },
    {
      label: 'Pending Approvals',
      value: '4',
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      change: '2 require attention',
      trend: 'neutral',
    },
    {
      label: 'Completed Today',
      value: '8',
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      change: '+15% vs yesterday',
      trend: 'up',
    },
    {
      label: 'Avg Processing Time',
      value: '4.2h',
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      change: '-0.3h improvement',
      trend: 'up',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
            <div>
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.username}</p>
      </div>

        {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
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
          })}
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
