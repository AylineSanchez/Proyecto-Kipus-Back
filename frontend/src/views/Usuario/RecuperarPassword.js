// kipus/src/views/Usuario/RecuperarPassword.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';
import logoHorizontal from '../../assets/VIVIENDA SUSTENTABLE HORIZONTAL.png';
import logo from '../../assets/logo.png';
import logoUtalca from '../../assets/logo_utalca.png';
import NotificationContainer from '../../components/NotificationContainer';
import { useNotification } from '../../hooks/useNotification';

function RecuperarPassword() {
  const [paso, setPaso] = useState(1); // 1: email, 2: código, 3: nueva contraseña
  const [formData, setFormData] = useState({
    email: '',
    codigo: '',
    nuevaPassword: '',
    confirmarPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [tokenTemporal, setTokenTemporal] = useState('');
  const navigate = useNavigate();
  
  const { notifications, removeNotification, showSuccess, showError } = useNotification();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Paso 1: Solicitar código
  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      showError('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/solicitar-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Código enviado', 'Revisa tu correo electrónico para continuar');
        setPaso(2);
      } else {
        showError(result.error || 'Error al solicitar el código');
      }
    } catch (error) {
      console.error('Error solicitando código:', error);
      showError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Verificar código
  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    
    if (!formData.codigo) {
      showError('Por favor ingresa el código de verificación');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/verificar-codigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          codigo: formData.codigo
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Código verificado', 'Ahora puedes crear una nueva contraseña');
        setTokenTemporal(result.token);
        setPaso(3);
      } else {
        showError(result.error || 'Código inválido');
      }
    } catch (error) {
      console.error('Error verificando código:', error);
      showError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  // Paso 3: Cambiar contraseña
  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    
    if (!formData.nuevaPassword || !formData.confirmarPassword) {
      showError('Por favor completa todos los campos');
      return;
    }

    if (formData.nuevaPassword.length < 8) {
      showError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (formData.nuevaPassword !== formData.confirmarPassword) {
      showError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/cambiar-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenTemporal,
          nuevaPassword: formData.nuevaPassword
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Contraseña actualizada', 'Tu contraseña ha sido cambiada correctamente');
        
        setTimeout(() => {
          navigate('/inicio-sesion');
        }, 2000);
      } else {
        showError(result.error || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      showError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const renderPaso = () => {
    switch (paso) {
      case 1:
        return (
          <form className="formulario" onSubmit={handleSolicitarCodigo}>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
              Ingresa tu correo electrónico y te enviaremos un código de verificación
            </p>
            
            <input 
              type="email" 
              name="email"
              placeholder="Correo electrónico" 
              value={formData.email}
              onChange={handleChange}
              required 
              disabled={loading}
            />
            
            <button 
              type="submit" 
              className="btn-registrar"
              disabled={loading}
            >
              {loading ? 'Enviando código...' : 'Enviar código'}
            </button>

            <div className="login-link">
              <Link to="/inicio-sesion">← Volver al inicio de sesión</Link>
            </div>
          </form>
        );

      case 2:
        return (
          <form className="formulario" onSubmit={handleVerificarCodigo}>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
              Ingresa el código de 6 dígitos que enviamos a <strong>{formData.email}</strong>
            </p>
            
            <input 
              type="text" 
              name="codigo"
              placeholder="Código de 6 dígitos" 
              value={formData.codigo}
              onChange={handleChange}
              maxLength={6}
              pattern="[0-9]{6}"
              required 
              disabled={loading}
              style={{ textAlign: 'center', letterSpacing: '5px', fontSize: '18px' }}
            />
            
            <button 
              type="submit" 
              className="btn-registrar"
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>

            <div className="login-link">
              <a href="#" onClick={(e) => {
                e.preventDefault();
                setPaso(1);
              }}>
                ← Cambiar correo electrónico
              </a>
            </div>
          </form>
        );

      case 3:
        return (
          <form className="formulario" onSubmit={handleCambiarPassword}>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
              Crea tu nueva contraseña
            </p>
            
            <input 
              type="password" 
              name="nuevaPassword"
              placeholder="Nueva contraseña" 
              value={formData.nuevaPassword}
              onChange={handleChange}
              required 
              disabled={loading}
            />
            
            <input 
              type="password" 
              name="confirmarPassword"
              placeholder="Confirmar nueva contraseña" 
              value={formData.confirmarPassword}
              onChange={handleChange}
              required 
              disabled={loading}
            />

            <button 
              type="submit" 
              className="btn-registrar"
              disabled={loading}
            >
              {loading ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
            </button>

            <div className="login-link">
              <a href="#" onClick={(e) => {
                e.preventDefault();
                setPaso(2);
              }}>
                ← Volver a ingresar código
              </a>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <NotificationContainer 
        notifications={notifications}
        onCloseNotification={removeNotification}
      />
      
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
            <Link to="/inicio-sesion">
              <button className="nav-btn">Iniciar sesión</button>
            </Link>
            <Link to="/registro">
              <button className="nav-btn primary">Registrarse</button>
            </Link>
          </div>
        </div>
      </header>

      <div className="main-content" style={{ background: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '450px', padding: '30px' }}>
          <h2 className="titulo-registro">
            {paso === 1 && 'Recuperar Contraseña'}
            {paso === 2 && 'Verificar Código'}
            {paso === 3 && 'Nueva Contraseña'}
          </h2>
          
          <img 
            src={logo} 
            alt="Logo Kipus A+" 
            className="logo-kipus" 
            style={{ width: '140px', height: '140px', margin: '0 auto 20px' }} 
          />
          
          {renderPaso()}
        </div>
      </div>
    </div>
  );
}

export default RecuperarPassword;