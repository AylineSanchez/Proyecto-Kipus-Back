// components/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Si no hay token, redirigir a login
  if (!token) {
    return <Navigate to="/inicio-sesion" replace />;
  }
  
  // Si no es administrador, redirigir a página de usuario
  if (user.tipo_usuario !== 'admin') {
    return <Navigate to="/evaluaciones" replace />;
  }
  
  return children;
};

export default AdminRoute;