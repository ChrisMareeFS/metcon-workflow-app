import { useState, useEffect } from 'react';
import StationLibrary from '../templates/StationLibrary';
import CheckLibrary from '../templates/CheckLibrary';
import FlowsList from './FlowsList';

type TabType = 'flows' | 'stations' | 'checks';

export default function FlowsManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('flows');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'flows', label: 'Flows' },
    { id: 'stations', label: 'Station Library' },
    { id: 'checks', label: 'Check Library' },
  ];

  useEffect(() => {
    const handleSwitchToStations = () => {
      setActiveTab('stations');
    };

    window.addEventListener('switchToStations', handleSwitchToStations);
    
    return () => {
      window.removeEventListener('switchToStations', handleSwitchToStations);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Flow Management</h1>
          <p className="text-gray-600 mt-1">Design and manage your workflow processes</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'flows' && <FlowsList />}
          {activeTab === 'stations' && <StationLibrary />}
          {activeTab === 'checks' && <CheckLibrary />}
        </div>
      </div>
    </div>
  );
}
