import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agent from './pages/Agent';
import Subjects from './pages/Subjects';
import Tasks from './pages/Tasks';
import Planner from './pages/Planner';
import Progress from './pages/Progress';
import AgentActivity from './pages/AgentActivity';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#21262d',
            color: '#e6edf3',
            border: '1px solid #30363d',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#21262d' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#21262d' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="agent" element={<Agent />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="planner" element={<Planner />} />
          <Route path="progress" element={<Progress />} />
          <Route path="activity" element={<AgentActivity />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
