// src/App.tsx - Main Router
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GeneralApp from './GeneralApp';
import ColumbiaApp from './ColumbiaApp';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GeneralApp />} />
        <Route path="/columbia" element={<ColumbiaApp />} />
      </Routes>
    </Router>
  );
}

export default App;