// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BmiCalculator from './bmi-count.jsx';
import InspectionCalendar from './components/calendar/InspectionCalendar.jsx';
import './App.css';


function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default route*/}
          <Route path="/" element={<BmiCalculator />} />

          {/* Inspection Scheduling Module */}
          <Route path="/calendar" element={<InspectionCalendar />} />

          {/* Optional: catch all undefined routes */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
