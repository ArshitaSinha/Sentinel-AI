import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Scanner from './pages/scanner';

// --- Auth Guard ---
// Protects the "Enterprise" routes. No token = No access.
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* 1. PUBLIC GATEWAY */}
        <Route path="/login" element={<Login />} />
        
        {/* 2. PROTECTED ENTERPRISE ROUTES */}
        <Route 
          path="/scanner" 
          element={
            <PrivateRoute>
              <Scanner />
            </PrivateRoute>
          } 
        />
        
        {/* 3. REDIRECTS (Stateless Mode) */}
        {/* Since we removed History/Dashboard, we force-direct to Scanner */}
        <Route path="/" element={<Navigate to="/scanner" replace />} />
        <Route path="*" element={<Navigate to="/scanner" replace />} />

      </Routes>
    </BrowserRouter>
  );
}