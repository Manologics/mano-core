import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AgentIntake from './pages/AgentIntake';
import AgentFollowUp from './pages/AgentFollowUp';
import CommandCenter from './pages/CommandCenter';
import LeadForm from './pages/LeadForm';
import AgentRetention from './pages/AgentRetention';
import AgentOps from './pages/AgentOps';
import AgentBooking from './pages/AgentBooking';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/AgentIntake" replace />} />
        <Route path="/AgentIntake" element={<AgentIntake />} />
        <Route path="/AgentFollowUp" element={<AgentFollowUp />} />
        <Route path="/CommandCenter" element={<CommandCenter />} />
        <Route path="/LeadForm" element={<LeadForm />} />
        <Route path="/AgentRetention" element={<AgentRetention />} />
        <Route path="/AgentOps" element={<AgentOps />} />
        <Route path="/AgentBooking" element={<AgentBooking />} />
        <Route path="/Settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
