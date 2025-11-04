import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import FlowsList from './pages/flows/FlowsList';
import FlowBuilder from './pages/flows/FlowBuilder';
import StationLibrary from './pages/templates/StationLibrary';
import CheckLibrary from './pages/templates/CheckLibrary';
// BatchList import removed - using WIPBoard instead
import StepRunner from './pages/batches/StepRunner';
import KanbanBoard from './pages/batches/KanbanBoard';
import WIPBoard from './pages/batches/WIPBoard';
import BatchDetail from './pages/batches/BatchDetail';
import ScanBatch from './pages/batches/ScanBatch';
import ProductionPlanUpload from './pages/batches/ProductionPlanUpload';
import Analytics from './pages/analytics/Analytics';
import UserManagement from './pages/admin/UserManagement';
import './App.css';

function App() {
  const { isAuthenticated } = useAuthStore();

  // Wrapper component for authenticated routes with layout
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <Layout>{children}</Layout>;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flows"
          element={
            <ProtectedRoute>
              <FlowsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flows/builder/:id"
          element={
            <ProtectedRoute>
              <FlowBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/stations"
          element={
            <ProtectedRoute>
              <StationLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/checks"
          element={
            <ProtectedRoute>
              <CheckLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches"
          element={
            <ProtectedRoute>
              <WIPBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/scan"
          element={
            <ProtectedRoute>
              <ScanBatch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/:id"
          element={
            <ProtectedRoute>
              <BatchDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/:id/execute"
          element={
            <ProtectedRoute>
              <StepRunner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/kanban"
          element={
            <ProtectedRoute>
              <KanbanBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/wip"
          element={
            <ProtectedRoute>
              <WIPBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/production-plans/upload"
          element={
            <ProtectedRoute>
              <ProductionPlanUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
