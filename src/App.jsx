import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Demo from './pages/Demo';
import AgentIntake from './pages/AgentIntake';
import AgentOps from './pages/AgentOps';
import CommandCenter from './pages/CommandCenter';
import LeadForm from './pages/LeadForm';
import Settings from './pages/Settings';
import AgentBooking from './pages/AgentBooking';
import AgentFollowUp from './pages/AgentFollowUp';
import AgentRetention from './pages/AgentRetention';
import DealAccess from './pages/DealAccess';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/Demo" replace />} />
        <Route path="/Demo" element={<Demo />} />
        <Route path="/AgentIntake" element={<AgentIntake />} />
        <Route path="/AgentOps" element={<AgentOps />} />
        <Route path="/CommandCenter" element={<CommandCenter />} />
        <Route path="/LeadForm" element={<LeadForm />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/AgentBooking" element={<AgentBooking />} />
        <Route path="/AgentFollowUp" element={<AgentFollowUp />} />
        <Route path="/AgentRetention" element={<AgentRetention />} />
        <Route path="/DealAccess" element={<DealAccess />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
