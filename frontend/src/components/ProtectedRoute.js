// components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Si no hay token, redirigir a login
  if (!token) {
    return <Navigate to="/inicio-sesion" replace />;
  }
  
  // Si el usuario está autenticado pero no tiene datos completos
  if (!user.id) {
    console.warn('Usuario autenticado pero sin datos completos');
    // Podrías hacer un refresh del token aquí si es necesario
  }
  
  return children;
};

export default ProtectedRoute;