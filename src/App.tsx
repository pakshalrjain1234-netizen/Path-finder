import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { BuildingDetailsScreen } from './screens/BuildingDetailsScreen'
import { CampusExplorerScreen } from './screens/CampusExplorerScreen'
import { HelpOfflineScreen } from './screens/HelpOfflineScreen'
import { NavigationScreen } from './screens/NavigationScreen'
import { SavedLocationsScreen } from './screens/SavedLocationsScreen'
import { SearchScreen } from './screens/SearchScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/welcome" replace />} />
        <Route path="welcome" element={<WelcomeScreen />} />
        <Route path="explore" element={<CampusExplorerScreen />} />
        <Route path="search" element={<SearchScreen />} />
        <Route path="navigation" element={<NavigationScreen />} />
        <Route path="building/:buildingId" element={<BuildingDetailsScreen />} />
        <Route path="saved" element={<SavedLocationsScreen />} />
        <Route path="help" element={<HelpOfflineScreen />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Route>
    </Routes>
  )
}

export default App
