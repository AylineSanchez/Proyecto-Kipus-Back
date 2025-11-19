// kipus/src/views/Usuario/inicioSesion.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';
import logoHorizontal from '../../assets/VIVIENDA SUSTENTABLE HORIZONTAL.png';
import logo from '../../assets/logo.png';
import logoUtalca from '../../assets/logo_utalca.png';
import NotificationContainer from '../../components/NotificationContainer';
import { useNotification } from '../../hooks/useNotification';

function InicioSesionUsuario() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Usar el hook de notificaciones - AGREGAR showInfo
  const { notifications, removeNotification, showSuccess, showError, showInfo } = useNotification();

  // ✅ Redirigir si ya está autenticado
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.tipo_usuario === 'usuario') {
        navigate('/evaluaciones');
      } else if (user.tipo_usuario === 'admin') {
        navigate('/admin/dashboard');
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validaciones básicas
    if (!formData.email || !formData.password) {
      showError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: formData.email,
          contraseña: formData.password
        }),
      });

      const result = await response.json();

      console.log('Respuesta del servidor:', result);

      if (result.success) {
        // ✅ LOGIN EXITOSO
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.usuario));
        
        console.log('Inicio de sesión exitoso:', result.data);
        
        // Mostrar mensaje de éxito en página
        showSuccess(`¡Bienvenido!`, 'Inicio de sesión exitoso');
        
        // Pequeño delay para mostrar el mensaje antes de redirigir
        setTimeout(() => {
          // Redirigir según el tipo de usuario
          if (result.data.usuario.tipo_usuario === 'usuario') {
            navigate('/evaluaciones');
          } else if (result.data.usuario.tipo_usuario === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/evaluaciones');
          }
        }, 1500);
        
      } else {
        showError(result.error || 'Error en el inicio de sesión');
      }
    } catch (error) {
      console.error('Error en login:', error);
      showError('Error de conexión al servidor. Verifica que el backend esté funcionando.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Contenedor de notificaciones */}
      <NotificationContainer 
        notifications={notifications}
        onCloseNotification={removeNotification}
      />
      
      {/* Navbar con logo horizontal */}
      <header className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <a href="/">
              <img 
                src={logoUtalca} 
                alt="Universidad de Talca" 
                className="navbar-logo"
                style={{ height: '80px', marginRight: '20px', marginTop: '10px', marginBottom: '10px' }}
              />
            </a>  
            <a href="/">
            <img 
              src={logoHorizontal} 
              alt="Kipus A+ Vivienda Sustentable" 
              className="navbar-logo"
            />
            </a>
          </div>
          <div className="navbar-buttons">
            <Link to="/inicio-sesion">
              <button className="nav-btn">Iniciar sesión</button>
            </Link>
            <Link to="/registro">
              <button className="nav-btn primary">Registrarse</button>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido del login con logo del formulario */}
      <div className="main-content" style={{ background: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '450px', padding: '30px' }}>
          <h2 className="titulo-registro">Iniciar Sesión</h2>
          <img 
            src={logo} 
            alt="Logo Kipus A+" 
            className="logo-kipus" 
            style={{ width: '200px', height: '200px', margin: '0 auto 20px' }} 
          />
          
          <form className="formulario" onSubmit={handleSubmit}>
            <input 
              type="email" 
              name="email"
              placeholder="Correo electrónico" 
              value={formData.email}
              onChange={handleChange}
              required 
              disabled={loading}
            />
            
            <input 
              type="password" 
              name="password"
              placeholder="Contraseña" 
              value={formData.password}
              onChange={handleChange}
              required 
              disabled={loading}
            />

            <div className="link">
              <Link to="/recuperar-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button 
              type="submit" 
              className="btn-registrar"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Entrar'}
            </button>

            <div className="login-link">
              ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InicioSesionUsuario;