import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CommandCenter from './pages/CommandCenter';
import AgentIntake from './pages/AgentIntake';
import LeadForm from './pages/LeadForm';
import AgentBooking from './pages/AgentBooking';
import AgentFollowUp from './pages/AgentFollowUp';
import AgentRetention from './pages/AgentRetention';
import AgentOps from './pages/AgentOps';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/CommandCenter" replace />} />
        <Route path="/CommandCenter" element={<CommandCenter />} />
        <Route path="/AgentIntake" element={<AgentIntake />} />
        <Route path="/LeadForm" element={<LeadForm />} />
        <Route path="/AgentBooking" element={<AgentBooking />} />
        <Route path="/AgentFollowUp" element={<AgentFollowUp />} />
        <Route path="/AgentRetention" element={<AgentRetention />} />
        <Route path="/AgentOps" element={<AgentOps />} />
        <Route path="/Settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
