import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Registro from './views/Usuario/registro';
import InicioSesionUsuario from './views/Usuario/inicioSesion';
import EvaluacionAgua from './views/Usuario/evaluacionAgua';
import EvaluacionCalefaccion from './views/Usuario/evaluacionCalefaccion';
import Comentario from './views/Usuario/comentario';
import Valoracion from './views/Usuario/valoracion';
import EvaluacionesUsuario from './views/Usuario/evaluaciones';
import DashboardMetricas from './views/Administrador/dashboardMetricas';
import ComentariosAdministrador from './views/Administrador/comentarios';
import ValoracionesAdministrador from './views/Administrador/valoraciones';
import AdministrarTablas from './views/Administrador/administrarTablas';
import Home from './views/Home/home';
import RecuperarPassword from './views/Usuario/RecuperarPassword';


// Importar componentes de protección de rutas
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Ruta Pública Principal - Home */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          
          {/* Rutas Públicas de Autenticación */}
          <Route path="/inicio-sesion" element={<InicioSesionUsuario />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-password" element={<RecuperarPassword />} />
          
          {/* Rutas Protegidas Usuario (requieren autenticación) */}
          <Route path="/evaluaciones" element={
            <ProtectedRoute>
              <EvaluacionesUsuario />
            </ProtectedRoute>
          } />
          <Route path="/calefaccion" element={
            <ProtectedRoute>
              <EvaluacionCalefaccion />
            </ProtectedRoute>
          } />
          <Route path="/agua" element={
            <ProtectedRoute>
              <EvaluacionAgua />
            </ProtectedRoute>
          } />
          <Route path="/comentarios" element={
            <ProtectedRoute>
              <Comentario />
            </ProtectedRoute>
          } />
          <Route path="/valoraciones" element={
            <ProtectedRoute>
              <Valoracion />
            </ProtectedRoute>
          } />
          
          {/* Rutas Protegidas Administrador (requieren autenticación admin) */}
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <DashboardMetricas />
            </AdminRoute>
          } />
          <Route path="/admin/comentarios" element={
            <AdminRoute>
              <ComentariosAdministrador />
            </AdminRoute>
          } />
          <Route path="/admin/valoraciones" element={
            <AdminRoute>
              <ValoracionesAdministrador />
            </AdminRoute>
          } />
          <Route path="/admin/administrar-tablas" element={
            <AdminRoute>
              <AdministrarTablas />
            </AdminRoute>
          } />
          
          {/* Ruta 404 - Página no encontrada */}
          <Route path="*" element={<div className="page-not-found">
            <h2>Página no encontrada</h2>
            <p>La página que buscas no existe.</p>
          </div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;