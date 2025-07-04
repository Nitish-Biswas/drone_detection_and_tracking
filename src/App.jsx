import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import VideoUploader from './videoUploader';
import DroneDashboard from './DroneDashboard';  // We’ll create this

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav style={{ display: 'flex', gap: '20px', padding: '10px', background: '#222', color: '#fff' }}>
          <Link to="/" style={{ color: '#0af' }}>Video Uploader</Link>
          <Link to="/dashboard" style={{ color: '#0af' }}>Drone Dashboard</Link>
        </nav>

        <Routes>
          <Route path="/" element={<VideoUploader />} />
          <Route path="/dashboard" element={<DroneDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
