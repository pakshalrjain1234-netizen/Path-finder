import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { AdminDashboardScreen } from './screens/AdminDashboardScreen'
import { AdminFeedbackScreen } from './screens/AdminFeedbackScreen'
import { BuildingDetailsScreen } from './screens/BuildingDetailsScreen'
import { CampusExplorerScreen } from './screens/CampusExplorerScreen'
import { HelpOfflineScreen } from './screens/HelpOfflineScreen'
import { LoginRoleScreen } from './screens/LoginRoleScreen'
import { NavigationScreen } from './screens/NavigationScreen'
import { SavedLocationsScreen } from './screens/SavedLocationsScreen'
import { SearchScreen } from './screens/SearchScreen'
import { StudentIssueScreen } from './screens/StudentIssueScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { GpsCalibrationWizardScreen } from './screens/GpsCalibrationWizardScreen'

// Development-only lazy import: excluded from production bundle
const DeveloperNavigationScreen = import.meta.env.DEV
  ? lazy(() =>
      import('./screens/DeveloperNavigationScreen').then((m) => ({
        default: m.DeveloperNavigationScreen,
      }))
    )
  : null

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Standalone Full-Screen Login & Role Selection (No AppLayout / No Sidebar) */}
        <Route path="/login" element={<LoginRoleScreen />} />

        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/welcome" replace />} />
          <Route path="welcome" element={<WelcomeScreen />} />
          <Route path="explore" element={<CampusExplorerScreen />} />
          <Route path="search" element={<SearchScreen />} />
          <Route path="navigation" element={<NavigationScreen />} />

          {/* Student and Admin Protected Issues Passport */}
          <Route
            path="issues"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentIssueScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-reports"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentIssueScreen />
              </ProtectedRoute>
            }
          />

          {/* Admin-Only Command Center & Feedback Management */}
          <Route
            path="admin/issues"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/feedback"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminFeedbackScreen />
              </ProtectedRoute>
            }
          />

          {import.meta.env.DEV && DeveloperNavigationScreen && (
            <Route
              path="dev-navigation"
              element={
                <Suspense fallback={null}>
                  <DeveloperNavigationScreen />
                </Suspense>
              }
            />
          )}
          <Route path="dev-gps-calibration" element={<GpsCalibrationWizardScreen />} />
          <Route path="calibration" element={<GpsCalibrationWizardScreen />} />
          <Route path="building/:buildingId" element={<BuildingDetailsScreen />} />
          <Route path="saved" element={<SavedLocationsScreen />} />
          <Route path="help" element={<HelpOfflineScreen />} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
