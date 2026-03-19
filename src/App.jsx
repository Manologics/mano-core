import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AgentBooking from './pages/AgentBooking';
import AgentFollowUp from './pages/AgentFollowUp';
import LeadForm from './pages/LeadForm';
import AgentOps from './pages/AgentOps';
import CommandCenter from './pages/CommandCenter';
import AgentRetention from './pages/AgentRetention';
import AgentIntake from './pages/AgentIntake';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/AgentBooking" replace />} />
        <Route path="/AgentBooking" element={<AgentBooking />} />
        <Route path="/AgentFollowUp" element={<AgentFollowUp />} />
        <Route path="/LeadForm" element={<LeadForm />} />
        <Route path="/AgentOps" element={<AgentOps />} />
        <Route path="/CommandCenter" element={<CommandCenter />} />
        <Route path="/AgentRetention" element={<AgentRetention />} />
        <Route path="/AgentIntake" element={<AgentIntake />} />
        <Route path="/Settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
