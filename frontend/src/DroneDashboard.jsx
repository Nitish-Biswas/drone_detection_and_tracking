import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import './DroneDashboard.css';

const data = Array.from({ length: 85 }, (_, i) => ({
  event: i + 1,
  confidence: (Math.random() * 0.4 + 0.5).toFixed(3), // Random confidence between 0.5-0.9
}));

const detections = [
  {
    timestamp: '2025-06-08 01:05:36',
    type: 'Commercial Survey',
    confidence: 0.759,
    threat: 'LOW',
    position: '(-280.3, 170.6, 171.2)',
    velocity: '(0.0, 0.0, 0.0)',
  },
  {
    timestamp: '2025-06-08 01:05:35',
    type: 'DJI Mavic',
    confidence: 0.891,
    threat: 'MEDIUM',
    position: '(-243.7, 397.4, 145.2)',
    velocity: '(0.0, 0.0, 0.0)',
  },
  {
    timestamp: '2025-06-08 01:05:35',
    type: 'Commercial Survey',
    confidence: 0.725,
    threat: 'LOW',
    position: '(431.2, 468.3, 51.4)',
    velocity: '(0.0, 0.0, 0.0)',
  },
  {
    timestamp: '2025-06-08 01:05:34',
    type: 'FPV Racing',
    confidence: 0.509,
    threat: 'HIGH',
    position: '(490.6, -366.3, 20.0)',
    velocity: '(23.8, 0.0, 0.0)',
  },
  {
    timestamp: '2025-06-08 01:05:34',
    type: 'DJI Phantom',
    confidence: 0.777,
    threat: 'MEDIUM',
    position: '(190.8, -1481.1, 105.8)',
    velocity: '(0.0, 0.0, 0.0)',
  },
];

function DroneDashboard() {
  return (
    <div className="dashboard-container">
      <h1>Drone Detection System Dashboard</h1>
      <br />

      <div className="top-section">
        <div className="system-metrics">
          <h3>System Metrics</h3>
          <p>Total Detections: 85</p>
          <p>True Positives: 70</p>
          <p style={{ color: 'red' }}>False Positives: 15</p>
          <p>Average Processing Time: <span style={{ color: 'orange' }}>70.80 ms</span></p>
          <p>Sensor Uptime:</p>
          <ul>
            <li>RF Sensor: 4.25 s</li>
            <li>LIDAR Sensor: 8.50 s</li>
            <li>Camera Sensor: 12.75 s</li>
            <li>Radar Sensor: 17.00 s</li>
          </ul>
          <p>System Uptime: 12 minutes</p>
        </div>

        <div className="chart">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event" />
              <YAxis domain={[0.5, 0.9]} />
              <Tooltip />
              <Line type="monotone" dataKey="confidence" stroke="#00ffff" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="buttons">
        <button className="green">System Online</button>
        <button className="yellow">Pause System</button>
        <button className="red">Clear Detections</button>
      </div>

      <div className="detections-table">
        <h3>Real-time Detections</h3>
        <br />
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Drone Type</th>
              <th>Confidence</th>
              <th>Threat Level</th>
              <th>Position (X,Y,Z)</th>
              <th>Velocity (X,Y,Z)</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((det, index) => (
              <tr key={index}>
                <td>{det.timestamp}</td>
                <td>{det.type}</td>
                <td>{det.confidence}</td>
                <td>{det.threat}</td>
                <td>{det.position}</td>
                <td>{det.velocity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DroneDashboard;
