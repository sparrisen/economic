import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProfileList from './ProfileList';
import ProfileDetail from './ProfileDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProfileList />} />
        <Route path="/profiles/:id" element={<ProfileDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
