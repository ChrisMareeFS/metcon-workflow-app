import { useState, useEffect } from 'react';
import { Download, Calendar, Package, Settings, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import { analyticsAPI } from '../../services/api';
import { LineChart, Line, BarChart, Bar, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface AnalyticsData {
  ytd_stats: {
    total_batches: number;
    total_fine_grams: number;
    total_loss_gain_g: number;
    loss_gain_percent: number;
    avg_recovery_percent: number;
    avg_ftt_hours: number;
    avg_ftt_recovery_percent: number;
    max_gain: number;
    max_loss: number;
    spread: number;
  };
  monthly_batches: Array<{
    month: string;
    count: number;
  }>;
  by_pipeline: Array<{
    pipeline: string;
    batches: number;
    fine_grams: number;
    recovery_percent: number;
  }>;
  batch_details?: Array<{
    batch_number: string;
    completed_at: string;
    fine_grams_received: number;
    loss_gain_g: number;
    loss_gain_percent: number;
    overall_recovery_percent: number;
    ftt_hours: number;
    month: string;
    sequence: number;
  }>;
}

interface KPISettings {
  uomUpper: number;
  uomLower: number;
  recoveryKpiUpper: number;
  recoveryKpiLower: number;
  fttKpiTarget: number;
}

export default function Analytics() {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [kpiSettings, setKpiSettings] = useState<KPISettings>({
    uomUpper: 1500,
    uomLower: -1500,
    recoveryKpiUpper: 100.4,
    recoveryKpiLower: 99.5,
    fttKpiTarget: 30,
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [year, selectedPipeline]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await analyticsAPI.getYTDStats(year, selectedPipeline);
      setData(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      setError(error.response?.data?.error || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await analyticsAPI.exportCSV('ytd', { year });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-ytd-${year}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('CSV export is not yet fully implemented');
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchData()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* Header */}
      <div className="flex items-center justify-between">
              <div>
          <h1 className="text-3xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">
            {selectedPipeline === 'all' 
              ? 'All Flows - Combined Performance & Metrics' 
              : `${selectedPipeline.charAt(0).toUpperCase() + selectedPipeline.slice(1)} Flow - Performance & Metrics`}
          </p>
            </div>

            <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-400" />
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Flows</option>
              <option value="copper">Copper</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
          </div>
          
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                    <option value={2023}>2023</option>
                  </select>
                </div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
            <Settings className="h-4 w-4" />
            KPI Settings
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
                Export CSV
          </button>
            </div>
          </div>

      {/* KPI Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">KPI Settings</h2>
                  <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                <X className="h-6 w-6" />
                  </button>
        </div>

            <div className="space-y-6">
              {/* UOM Limits */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Cumulative Au Trend Limits (g)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UOM Upper Limit
                    </label>
                    <input
                      type="number"
                      value={kpiSettings.uomUpper}
                      onChange={(e) => setKpiSettings({ ...kpiSettings, uomUpper: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="1500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UOM Lower Limit
                    </label>
                    <input
                      type="number"
                      value={kpiSettings.uomLower}
                      onChange={(e) => setKpiSettings({ ...kpiSettings, uomLower: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="-1500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Recovery KPI Limits */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Overall Recovery KPI (%)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      KPI Upper
                    </label>
                <input
                      type="number"
                      step="0.1"
                      value={kpiSettings.recoveryKpiUpper}
                      onChange={(e) => setKpiSettings({ ...kpiSettings, recoveryKpiUpper: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="100.4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      KPI Lower
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpiSettings.recoveryKpiLower}
                      onChange={(e) => setKpiSettings({ ...kpiSettings, recoveryKpiLower: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="99.5"
                />
                  </div>
                </div>
              </div>
              
              {/* FTT KPI Target */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">FTT KPI Target (hours)</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Hours
                  </label>
                <input
                    type="number"
                    value={kpiSettings.fttKpiTarget}
                    onChange={(e) => setKpiSettings({ ...kpiSettings, fttKpiTarget: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="30"
                />
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setKpiSettings({
                    uomUpper: 1500,
                    uomLower: -1500,
                    recoveryKpiUpper: 100.4,
                    recoveryKpiLower: 99.5,
                    fttKpiTarget: 30,
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
        )}

      {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
        <YTDSummary data={data} kpiSettings={kpiSettings} selectedPipeline={selectedPipeline} />
      )}
    </div>
  );
}

// YTD Summary Component
function YTDSummary({ data, kpiSettings, selectedPipeline }: { data: AnalyticsData; kpiSettings: KPISettings; selectedPipeline: string }) {
  const stats = data?.ytd_stats;

  const getMetalName = () => {
    switch (selectedPipeline) {
      case 'copper': return 'Copper';
      case 'silver': return 'Silver';
      case 'gold': return 'Gold';
      default: return 'All Metals';
    }
  };

  const metalName = getMetalName();

  // Prepare cumulative data for charts using actual batch data
  const prepareCumulativeData = () => {
    if (!data?.batch_details || data.batch_details.length === 0) return [];
    
    let cumulativeLossGain = 0;
    let cumulativeFineGrams = 0;
    
    return data.batch_details.map((batch) => {
      cumulativeLossGain += batch.loss_gain_g;
      cumulativeFineGrams += batch.fine_grams_received;
      
      return {
        batch_number: batch.batch_number,
        sequence: batch.sequence,
        cumulativeLossGain: Number(cumulativeLossGain.toFixed(2)),
        cumulativeFineGrams: Number(cumulativeFineGrams.toFixed(0)),
        uomUpper: kpiSettings.uomUpper,
        uomLower: kpiSettings.uomLower,
        zero: 0,
      };
    });
  };

  const cumulativeData = prepareCumulativeData();

  // Prepare recovery and FTT data using actual batch data
  const recoveryData = data?.batch_details?.map((batch) => ({
    batch_number: batch.batch_number,
    sequence: batch.sequence,
    recovery: batch.overall_recovery_percent,
    kpiLower: kpiSettings.recoveryKpiLower,
    kpiUpper: kpiSettings.recoveryKpiUpper,
  })) || [];

  const fttData = data?.batch_details?.map((batch) => ({
    batch_number: batch.batch_number,
    sequence: batch.sequence,
    hours: batch.ftt_hours,
    kpi: kpiSettings.fttKpiTarget,
    batchAverage: stats?.avg_ftt_hours || 0, // Batch average line
  })) || [];

  return (
    <>
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Batches */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Batches Processed</p>
          <p className="text-4xl font-semibold text-gray-900 mt-4">{stats?.total_batches || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Per month (YTD)</p>
            </div>

        {/* Fine Content */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Fine Content ({metalName})</p>
          <p className="text-4xl font-semibold text-gray-900 mt-4">
                {stats?.total_fine_grams.toLocaleString('en-US', { maximumFractionDigits: 2 })} g
              </p>
          <p className="text-xs text-gray-500 mt-2">Total received</p>
            </div>

        {/* Loss/Gain Grams */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Loss/Gain ({metalName})</p>
          <p className={`text-4xl font-semibold mt-4 ${stats && stats.total_loss_gain_g >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats && stats.total_loss_gain_g >= 0 ? '+' : ''}{stats?.total_loss_gain_g.toFixed(2)} g
              </p>
          <p className="text-xs text-gray-500 mt-2">YTD cumulative</p>
        </div>

        {/* YTD Loss/Gain % */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">YTD Loss/Gain %</p>
          <p className={`text-4xl font-semibold mt-4 ${stats && stats.loss_gain_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats && stats.loss_gain_percent >= 0 ? '+' : ''}{stats?.loss_gain_percent.toFixed(4)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Of fine g received</p>
            </div>

        {/* Overall Recovery */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm font-medium text-gray-600">Overall Recovery</p>
          <p className="text-4xl font-semibold text-gray-900 mt-4">
                {stats?.avg_recovery_percent.toFixed(4)}%
              </p>
          <p className="text-xs text-gray-500 mt-2">Average across all batches</p>
            </div>

        {/* FTT Hours */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm font-medium text-gray-600">First Time Through</p>
          <p className="text-4xl font-semibold text-gray-900 mt-4">
                {stats?.avg_ftt_hours.toFixed(2)} hrs
              </p>
          <p className="text-xs text-gray-500 mt-2">Received to first export (excl. weekends)</p>
            </div>

        {/* FTT Recovery % */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">FTT Recovery %</p>
          <p className="text-4xl font-semibold text-gray-900 mt-4">
                {stats?.avg_ftt_recovery_percent.toFixed(2)}%
              </p>
          <p className="text-xs text-gray-500 mt-2">Gold in first export pour</p>
            </div>

        {/* Max Spread */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Max Spread (Lock-up)</p>
          <p className="text-4xl font-semibold text-gray-900 mt-4">
                {stats?.spread.toFixed(2)} g
              </p>
          <p className="text-xs text-gray-500 mt-2">Carryover measure</p>
            </div>
            </div>

      {/* Gain/Loss Range Card */}
      <div className="bg-white rounded-xl p-8 border border-gray-200 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Maximum Gain/Loss Range ({metalName})</h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-gray-600 mb-2">Max Gain</p>
            <p className="text-3xl font-semibold text-green-600">+{stats?.max_gain.toFixed(2)} g</p>
              </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Max Loss</p>
            <p className="text-3xl font-semibold text-red-600">{stats?.max_loss.toFixed(2)} g</p>
              </div>
            </div>
          </div>

      {/* Charts Section - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Cumulative Metal Trend Chart */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cumulative {metalName} Trend (g)</h3>
          <p className="text-xs text-gray-500 mb-6">Showing cumulative loss/gain with UOM limits</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="sequence" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Batch #', position: 'insideBottom', offset: -5, style: { fontSize: '12px', fill: '#6b7280' } }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Grams', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280' } }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [`${value.toFixed(2)} g`, 'Cumulative Loss/Gain']}
                  labelFormatter={(label) => `Batch #${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine y={kpiSettings.uomUpper} stroke="#3b82f6" strokeDasharray="3 3" label="UOM Upper" />
                <ReferenceLine y={kpiSettings.uomLower} stroke="#ef4444" strokeDasharray="3 3" label="UOM Lower" />
                <ReferenceLine y={0} stroke="#1f2937" strokeWidth={2} label="Zero" />
                <Line type="monotone" dataKey="cumulativeLossGain" stroke="#dc2626" strokeWidth={2} name="Actual Loss/Gain" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span className="text-gray-600">UOM Lower</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span className="text-gray-600">UOM Upper</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-gray-800"></div>
              <span className="text-gray-600">Zero</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
              <span className="text-gray-600">Actual</span>
            </div>
          </div>
      </div>

        {/* Cumulative Metal Received Chart */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cumulative {metalName} Received (g)</h3>
          <p className="text-xs text-gray-500 mb-6">Total received over time</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="sequence" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Batch #', position: 'insideBottom', offset: -5, style: { fontSize: '12px', fill: '#6b7280' } }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [`${value.toLocaleString()} g`, `Cumulative ${metalName}`]}
                  labelFormatter={(label) => `Batch #${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="stepAfter" dataKey="cumulativeFineGrams" stroke="#1e40af" strokeWidth={2} fill="#3b82f6" name={`Cumulative ${metalName} Received`} dot={{ fill: '#1e40af', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Recovery % Chart */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Recovery (%)</h3>
          <p className="text-xs text-gray-500 mb-6">Recovery percentage with KPI thresholds</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recoveryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="sequence" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Batch #', position: 'insideBottom', offset: -5, style: { fontSize: '12px', fill: '#6b7280' } }}
                />
                <YAxis domain={[99, 101]} stroke="#6b7280" style={{ fontSize: '12px' }} tickFormatter={(value) => `${value.toFixed(1)}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [`${value.toFixed(4)}%`, 'Recovery']}
                  labelFormatter={(label) => `Batch #${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine y={kpiSettings.recoveryKpiUpper} stroke="#ef4444" strokeDasharray="3 3" label="KPI Upper" />
                <ReferenceLine y={kpiSettings.recoveryKpiLower} stroke="#ef4444" strokeDasharray="3 3" label="KPI Lower" />
                <ReferenceLine y={100} stroke="#1f2937" strokeWidth={1} label="Zero" />
                <Line type="monotone" dataKey="recovery" stroke="#1e40af" strokeWidth={2} name="Overall Recovery" dot={{ stroke: '#1e40af', fill: '#1e40af', r: 3, strokeWidth: 2 }} />
                <Scatter dataKey="recovery" fill="#3b82f6" name="Discrete Recovery" shape="circle" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span className="text-gray-600">KPI Limits ({kpiSettings.recoveryKpiLower}% - {kpiSettings.recoveryKpiUpper}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Recovery %</span>
            </div>
          </div>
        </div>

        {/* FTT Hours Chart */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">FTT (Hours) - Excluding Weekends</h3>
          <p className="text-xs text-gray-500 mb-6">First Time Through processing time</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fttData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="sequence" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Batch #', position: 'insideBottom', offset: -5, style: { fontSize: '12px', fill: '#6b7280' } }}
                  interval={4}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [`${value.toFixed(1)} hrs`, 'Hours']}
                  labelFormatter={(label) => `Batch #${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine y={kpiSettings.fttKpiTarget} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label="KPI Target" />
                <Line type="monotone" dataKey="batchAverage" stroke="#1f2937" strokeWidth={2} name="Batch Average" dot={false} />
                <Bar dataKey="hours" fill="#1e40af" name="Time to Process" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-800"></div>
              <span className="text-gray-600">Time to Process</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-gray-800"></div>
              <span className="text-gray-600">Batch Average</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span className="text-gray-600">KPI Target ({kpiSettings.fttKpiTarget} hrs)</span>
            </div>
          </div>
        </div>

        {/* Batches Per Month */}
        <div className="bg-white rounded-xl p-8 border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Batches Processed Per Month</h3>
          <p className="text-xs text-gray-500 mb-6">Monthly batch throughput</p>
          <div className="h-64 flex items-end justify-between gap-3">
            {data?.monthly_batches?.map((month) => {
              const maxCount = Math.max(...(data.monthly_batches?.map(m => m.count) || [1]));
              const heightPercent = maxCount > 0 ? (month.count / maxCount) * 100 : 0;
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-green-500 rounded-t-lg hover:bg-green-600 transition-colors" 
                    style={{ 
                      height: `${heightPercent}%`, 
                      minHeight: month.count > 0 ? '30px' : '0' 
                    }}
                  >
                    {month.count > 0 && (
                      <div className="text-sm text-white font-semibold text-center pt-2">{month.count}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-3 font-medium">{month.month}</div>
                </div>
              );
            })}
          </div>
                </div>
      </div>

      {/* Year to Date Summary Table */}
      <div className="bg-white rounded-xl p-8 border border-gray-200 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Year to Date Summary Table</h3>
      <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b-2 border-gray-300">
              <tr className="text-left">
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Metric</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Batches</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Fine g</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">LG Grams</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">YTD LG %</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">FTT (time)</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">FTT (rec)</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">OARec</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">MaxG</th>
                <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">MaxL</th>
                <th className="pb-3 text-sm font-semibold text-gray-700">SPREAD</th>
            </tr>
          </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-4 pr-4 text-sm font-medium text-gray-900">{metalName}</td>
                <td className="py-4 pr-4 text-sm text-gray-700">{stats?.total_batches || 0}</td>
                <td className="py-4 pr-4 text-sm text-gray-700">{stats?.total_fine_grams.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                <td className={`py-4 pr-4 text-sm font-medium ${stats && stats.total_loss_gain_g >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats && stats.total_loss_gain_g >= 0 ? '+' : ''}{stats?.total_loss_gain_g.toFixed(2)}
                  </td>
                <td className={`py-4 pr-4 text-sm font-medium ${stats && stats.loss_gain_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats && stats.loss_gain_percent >= 0 ? '+' : ''}{stats?.loss_gain_percent.toFixed(4)}%
                  </td>
                <td className="py-4 pr-4 text-sm text-gray-700">{stats?.avg_ftt_hours.toFixed(2)}h</td>
                <td className="py-4 pr-4 text-sm text-gray-700">{stats?.avg_ftt_recovery_percent.toFixed(2)}%</td>
                <td className="py-4 pr-4 text-sm text-gray-700">{stats?.avg_recovery_percent.toFixed(4)}%</td>
                <td className="py-4 pr-4 text-sm text-green-600">+{stats?.max_gain.toFixed(2)}</td>
                <td className="py-4 pr-4 text-sm text-red-600">{stats?.max_loss.toFixed(2)}</td>
                <td className="py-4 text-sm text-gray-700">{stats?.spread.toFixed(2)}</td>
                </tr>
          </tbody>
        </table>
      </div>
      </div>

      {/* Operator Performance Section */}
      <OperatorPerformance />

      {/* Info Note */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mt-6">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Analytics are calculated from completed batches with full tracking data. 
          In-progress batches are excluded from calculations. Data refreshes every 5 minutes.
        </p>
      </div>
    </>
  );
}

// Operator Performance Component
function OperatorPerformance() {
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperatorPerformance();
  }, []);

  const fetchOperatorPerformance = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getOperatorPerformance();
      console.log('Full response:', response);
      console.log('response.data:', response.data);
      console.log('response.data.data:', response.data.data);
      console.log('response.data.data keys:', Object.keys(response.data.data || {}));
      console.log('response.data.data.operators:', response.data.data?.operators);
      console.log('JSON:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.data?.operators) {
        setOperators(response.data.data.operators);
        console.log('✅ Set operators:', response.data.data.operators.length);
      } else {
        console.error('❌ No operators in response');
      }
    } catch (error: any) {
      console.error('Failed to fetch operator performance:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
}
  };

  if (loading) {
  return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 mt-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
      </div>
  );
}

  if (!operators || operators.length === 0) {
  return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operator Performance Leaderboard</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No operator data available.</p>
          <p className="text-sm text-gray-400 mt-2">Check browser console for errors.</p>
      </div>
        </div>
  );
}
  
  return (
    <div className="bg-white rounded-xl p-8 border border-gray-200 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Operator Performance Leaderboard</h3>
        <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b-2 border-gray-300">
            <tr className="text-left">
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Rank</th>
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Operator</th>
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Batches</th>
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Fine Content</th>
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Total L/G</th>
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Avg Recovery</th>
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Avg FTT</th>
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">On-Time %</th>
              <th className="pb-3 pr-4 text-sm font-semibold text-gray-700">Efficiency Score</th>
              </tr>
            </thead>
          <tbody>
            {operators.map((op, index) => (
              <tr key={op.operator_id} className="border-b border-gray-200">
                <td className="py-4 pr-4">
                  <div className="flex items-center">
                    {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                    {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                    {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                    <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                  </div>
                    </td>
                <td className="py-4 pr-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{op.operator_name}</p>
                    <p className="text-xs text-gray-500">{op.operator_email}</p>
                  </div>
                    </td>
                <td className="py-4 pr-4 text-sm text-gray-700">{op.total_batches}</td>
                <td className="py-4 pr-4 text-sm text-gray-700">
                  {op.total_fine_grams.toLocaleString('en-US', { maximumFractionDigits: 0 })} g
                </td>
                <td className={`py-4 pr-4 text-sm font-medium ${op.total_loss_gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {op.total_loss_gain >= 0 ? '+' : ''}{op.total_loss_gain.toFixed(2)} g
                </td>
                <td className="py-4 pr-4 text-sm text-gray-700">{op.avg_recovery.toFixed(4)}%</td>
                <td className="py-4 pr-4 text-sm text-gray-700">{op.avg_ftt_hours.toFixed(1)}h</td>
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          op.on_time_percentage >= 80 ? 'bg-green-500' :
                          op.on_time_percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(op.on_time_percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-700 w-12">{op.on_time_percentage.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${
                      op.efficiency_score >= 0.9 ? 'text-green-600' :
                      op.efficiency_score >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(op.efficiency_score * 100).toFixed(1)}
                    </span>
                    {op.efficiency_score >= 0.9 && <span>⭐</span>}
                  </div>
                </td>
                  </tr>
            ))}
            </tbody>
          </table>
        </div>
      
      {/* Performance Metrics Legend */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div className="text-sm">
          <p className="font-semibold text-gray-700 mb-1">🥇 Top Performer</p>
          <p className="text-gray-600">Most batches processed with high quality</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-gray-700 mb-1">⭐ Star Rating</p>
          <p className="text-gray-600">Efficiency score ≥90% (on-time, recovery, speed)</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-gray-700 mb-1">📊 On-Time Target</p>
          <p className="text-gray-600">First Time Through ≤36 hours</p>
        </div>
      </div>
    </div>
  );
}
