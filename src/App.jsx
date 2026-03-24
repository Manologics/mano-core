import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AgentBooking from './pages/AgentBooking';
import AgentFollowUp from './pages/AgentFollowUp';
import AgentIntake from './pages/AgentIntake';
import AgentOps from './pages/AgentOps';
import AgentRetention from './pages/AgentRetention';
import CommandCenter from './pages/CommandCenter';
import DealAccess from './pages/DealAccess';
import LeadForm from './pages/LeadForm';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/CommandCenter" replace />} />
        <Route path="/AgentBooking" element={<AgentBooking />} />
        <Route path="/AgentFollowUp" element={<AgentFollowUp />} />
        <Route path="/AgentIntake" element={<AgentIntake />} />
        <Route path="/AgentOps" element={<AgentOps />} />
        <Route path="/AgentRetention" element={<AgentRetention />} />
        <Route path="/CommandCenter" element={<CommandCenter />} />
        <Route path="/DealAccess" element={<DealAccess />} />
        <Route path="/LeadForm" element={<LeadForm />} />
        <Route path="/Settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App