import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Watchlists from './pages/Watchlists';
import Alerts from './pages/Alerts';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/watchlists" element={<Watchlists />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<div className="text-foreground text-2xl font-bold">Settings - Coming Soon</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;