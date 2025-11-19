import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoHorizontal from '../assets/VIVIENDA SUSTENTABLE HORIZONTAL.png';
import logoUtalca from '../assets/logo_utalca.png';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/admin/dashboard', label: 'Métricas y estadísticas' },
    { path: '/admin/comentarios', label: 'Comentarios' },
    { path: '/admin/valoraciones', label: 'Valoraciones' },
    { path: '/admin/administrar-tablas', label: 'Administrar tablas' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/inicio-sesion');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Cerrar sidebar al cambiar de ruta
  useEffect(() => {
    closeSidebar();
  }, [location]);

  // Cerrar sidebar al hacer clic fuera en móvil
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar-menu');
        const toggleButton = document.querySelector('.sidebar-toggle');
        
        if (sidebar && !sidebar.contains(event.target) && 
            toggleButton && !toggleButton.contains(event.target)) {
          closeSidebar();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <img 
              src={logoUtalca} 
              alt="Universidad de Talca" 
              className="navbar-logo"
              style={{ height: '80px', marginRight: '20px', marginTop: '10px', marginBottom: '10px' }}
            />
            <img 
              src={logoHorizontal} 
              alt="Kipus A+ Vivienda Sustentable" 
              className="navbar-logo"
            />
          </div>
          <div className="navbar-buttons">
            <span id='nombre'>{user.nombre_completo || 'Usuario'}</span>
            <button 
              className="btn-nav" 
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="main-content-container">
        {/* Botón hamburguesa para móvil */}
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>

        {/* Overlay para móvil */}
        <div 
          className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        <nav className={`sidebar-menu ${sidebarOpen ? 'active' : ''}`}>
          <ul>
            {menuItems.map(item => (
              <li 
                key={item.path} 
                className={location.pathname === item.path ? 'active' : ''}
              >
                <Link to={item.path}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="evaluacion-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;