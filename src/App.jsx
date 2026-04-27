import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AgentBooking from './pages/AgentBooking';
import AgentFollowUp from './pages/AgentFollowUp';
import AgentIntake from './pages/AgentIntake';
import AgentOps from './pages/AgentOps';
import AgentRetention from './pages/AgentRetention';
import CommandCenter from './pages/CommandCenter';
import ManoCommandCenter from './pages/ManoCommandCenter';
import DealAccess from './pages/DealAccess';
import LeadForm from './pages/LeadForm';
import Settings from './pages/Settings';
import Demo from './pages/Demo';
import ChatCenter from './pages/ChatCenter';
import ManoChat from './pages/ManoChat';
import BuilderChat from './pages/BuilderChat';
import CustomerPortal from './pages/CustomerPortal';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/AgentBooking" replace />} />
        <Route path="/AgentBooking" element={<AgentBooking />} />
        <Route path="/AgentFollowUp" element={<AgentFollowUp />} />
        <Route path="/AgentIntake" element={<AgentIntake />} />
        <Route path="/AgentOps" element={<AgentOps />} />
        <Route path="/AgentRetention" element={<AgentRetention />} />
        <Route path="/CommandCenter" element={<ManoCommandCenter />} />
        <Route path="/CommandCenter/legacy" element={<CommandCenter />} />
        <Route path="/DealAccess" element={<DealAccess />} />
        <Route path="/LeadForm" element={<LeadForm />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/Demo" element={<Demo />} />
        <Route path="/ChatCenter" element={<ChatCenter />} />
        <Route path="/ManoChat" element={<ManoChat />} />
        <Route path="/BuilderChat" element={<BuilderChat />} />
        <Route path="/portal" element={<CustomerPortal />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App