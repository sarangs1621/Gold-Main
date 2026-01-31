import '@/App.css';
import '@/index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PermissionProtectedRoute } from './components/PermissionProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import JobCardsPage from './pages/JobCardsPage';
import InvoicesPage from './pages/InvoicesPage';
import PartiesPage from './pages/PartiesPage';
import FinancePage from './pages/FinancePage';
import DailyClosingPage from './pages/DailyClosingPage';
import ReportsPage from './pages/ReportsPageEnhanced';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';
import PurchasesPage from './pages/PurchasesPage';
import WorkersPage from './pages/WorkersPage';
import ReturnsPage from './pages/ReturnsPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="inventory.view">
                  <DashboardLayout>
                    <InventoryPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobcards"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="jobcards.view">
                  <DashboardLayout>
                    <JobCardsPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="invoices.view">
                  <DashboardLayout>
                    <InvoicesPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/parties"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="parties.view">
                  <DashboardLayout>
                    <PartiesPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="purchases.view">
                  <DashboardLayout>
                    <PurchasesPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="finance.view">
                  <DashboardLayout>
                    <FinancePage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-closing"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="finance.view">
                  <DashboardLayout>
                    <DailyClosingPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="reports.view">
                  <DashboardLayout>
                    <ReportsPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="audit.view">
                  <DashboardLayout>
                    <AuditLogsPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WorkersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/returns"
            element={
              <ProtectedRoute>
                <PermissionProtectedRoute permission="returns.view">
                  <DashboardLayout>
                    <ReturnsPage />
                  </DashboardLayout>
                </PermissionProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
