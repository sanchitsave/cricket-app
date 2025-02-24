import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import LiveScoreView from './components/LiveScoreView';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div>
        <nav>
          <Link to="/">Admin Dashboard</Link>
          <Link to="/live-score">Live Score</Link>
        </nav>
        <Routes>
          <Route exact path="/" element={<AdminDashboard />} />
          <Route path="/live-score" element={<LiveScoreView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;