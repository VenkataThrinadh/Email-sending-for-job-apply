import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import MainLayout from '../layouts/MainLayout'

// Pages
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import Campaigns from '../pages/Campaigns'
import CreateCampaign from '../pages/CreateCampaign'
import CampaignDetail from '../pages/CampaignDetail'
import Queue from '../pages/Queue'
import Domains from '../pages/Domains'
import Personalization from '../pages/Personalization'
import Bounces from '../pages/Bounces'
import Reputation from '../pages/Reputation'

// Page titles map
const pageTitles = {
  '/': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/campaigns/create': 'Create Campaign',
  '/queue': 'Queue Management',
  '/domains': 'Domains & IP Rotation',
  '/personalization': 'Personalization Engine',
  '/bounces': 'Bounce & Complaint Handling',
  '/reputation': 'Reputation Monitoring',
  '/campaigns/:id': 'Campaign Detail',
}

const LayoutRoute = ({ element, path }) => (
  <MainLayout title={pageTitles[path] || 'EmailPro'}>
    {element}
  </MainLayout>
)

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/"                   element={<LayoutRoute path="/"                   element={<Dashboard />} />} />
        <Route path="/campaigns"           element={<LayoutRoute path="/campaigns"           element={<Campaigns />} />} />
        <Route path="/campaigns/create"    element={<LayoutRoute path="/campaigns/create"    element={<CreateCampaign />} />} />
        <Route path="/campaigns/:id"         element={<MainLayout title="Campaign Detail"><CampaignDetail /></MainLayout>} />
        <Route path="/queue"               element={<LayoutRoute path="/queue"               element={<Queue />} />} />
        <Route path="/domains"             element={<LayoutRoute path="/domains"             element={<Domains />} />} />
        <Route path="/personalization"     element={<LayoutRoute path="/personalization"     element={<Personalization />} />} />
        <Route path="/bounces"             element={<LayoutRoute path="/bounces"             element={<Bounces />} />} />
        <Route path="/reputation"          element={<LayoutRoute path="/reputation"          element={<Reputation />} />} />
      </Route>

      {/* 404 → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
