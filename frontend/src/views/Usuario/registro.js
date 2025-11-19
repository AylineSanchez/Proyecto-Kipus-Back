// kipus/src/views/Usuario/registro.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';
import logoHorizontal from '../../assets/VIVIENDA SUSTENTABLE HORIZONTAL.png';
import logo from '../../assets/logo.png';
import logoUtalca from '../../assets/logo_utalca.png';
import NotificationContainer from '../../components/NotificationContainer';
import { useNotification } from '../../hooks/useNotification';

function Registro() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    comuna: '',
    region: '',
    regionId: '',
    personas: '',
    superficie1: '',
    superficie2: '0'
  });
  
  const [regiones, setRegiones] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Usar el hook de notificaciones
  const { notifications, removeNotification, showSuccess, showError, showInfo } = useNotification();

  // Cargar regiones al montar el componente
  useEffect(() => {
    cargarRegiones();
  }, []);

  const cargarRegiones = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ubicacion/regiones');
      const result = await response.json();
      
      if (result.success) {
        const regionesOrdenadasPorId = result.data.sort((a, b) => a.id - b.id);
        setRegiones(regionesOrdenadasPorId);
      } else {
        showError('Error al cargar regiones');
      }
    } catch (error) {
      console.error('Error cargando regiones:', error);
      showError('Error de conexión al servidor');
    }
  };

  const cargarComunasPorRegion = async (regionId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/ubicacion/comunas/region/${regionId}`);
      const result = await response.json();
      
      if (result.success) {
        const comunasOrdenadasAlfabeticamente = result.data.sort((a, b) => 
          a.nombre.localeCompare(b.nombre)
        );
        setComunas(comunasOrdenadasAlfabeticamente);
      } else {
        showError('Error al cargar comunas');
        setComunas([]);
      }
    } catch (error) {
      console.error('Error cargando comunas:', error);
      setComunas([]);
    }
  };

  const handleRegionChange = async (e) => {
    const regionId = e.target.value;
    const regionNombre = e.target.options[e.target.selectedIndex].text;
    
    setFormData(prev => ({
      ...prev,
      region: regionNombre,
      regionId: regionId,
      comuna: ''
    }));

    if (regionId) {
      await cargarComunasPorRegion(regionId);
    } else {
      setComunas([]);
    }
  };

  const handleComunaChange = (e) => {
    const comunaNombre = e.target.value;
    
    setFormData(prev => ({
      ...prev,
      comuna: comunaNombre
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSinSegundoPiso = () => {
    setFormData(prev => ({
      ...prev,
      superficie2: '0'
    }));
    showInfo('Se ha establecido la superficie del segundo piso en 0 m²');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // VALIDACIONES COMPLETAS DE CAMPOS OBLIGATORIOS
    if (!formData.email || !formData.password || !formData.nombre || !formData.region || !formData.comuna) {
      showError('Todos los campos marcados con * son obligatorios');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      showError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    if (!formData.superficie1 || parseFloat(formData.superficie1) <= 0) {
      showError('La superficie del primer piso es obligatoria y debe ser mayor a 0');
      setLoading(false);
      return;
    }

    if (!formData.personas || parseInt(formData.personas) < 1) {
      showError('El número de personas debe ser al menos 1');
      setLoading(false);
      return;
    }

    // Asegurar que superficie2 tenga valor (0 si está vacío)
    const datosEnvio = {
      ...formData,
      superficie2: formData.superficie2 || '0'
    };

    try {
      const response = await fetch('http://localhost:5000/api/auth/registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosEnvio),
      });

      const result = await response.json();

      if (result.success) {
        // ✅ REGISTRO EXITOSO
        console.log('Usuario registrado exitosamente');
        showSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.', '¡Bienvenido!');
        
        // Redirigir a login después de mostrar el mensaje
        setTimeout(() => {
          navigate('/inicio-sesion');
        }, 2000);
      } else {
        showError(result.error || 'Error en el registro');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      showError('Error de conexión al servidor');
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

      <div className="main-content" style={{ background: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '500px', padding: '30px' }}>
          <h2 className="titulo-registro">Regístrate</h2>
          <img 
            src={logo} 
            alt="Logo Kipus A+" 
            className="logo-kipus" 
            style={{ width: '140px', height: '140px', margin: '0 auto 20px' }} 
          />

          <form className="formulario" onSubmit={handleSubmit}>
            {/* Campos obligatorios */}
            <input 
              type="email" 
              name="email"
              placeholder="Correo electrónico *" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
            
            <input 
              type="password" 
              name="password"
              placeholder="Contraseña (mínimo 8 caracteres) *" 
              value={formData.password}
              onChange={handleChange}
              required 
              minLength="8"
            />
            
            <input 
              type="text" 
              name="nombre"
              placeholder="Nombre completo *" 
              value={formData.nombre}
              onChange={handleChange}
              required 
            />
            
            <select 
              name="region"
              value={formData.regionId}
              onChange={handleRegionChange}
              className="form-select"
              required
            >
              <option value="">Selecciona una región *</option>
              {regiones.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.nombre}
                </option>
              ))}
            </select>
            
            <select 
              name="comuna"
              value={formData.comuna}
              onChange={handleComunaChange}
              className="form-select"
              required
              disabled={!formData.regionId}
            >
              <option value="">
                {formData.regionId ? 'Selecciona una comuna *' : 'Primero selecciona una región'}
              </option>
              {comunas.map((comuna) => (
                <option key={comuna.id} value={comuna.nombre}>
                  {comuna.nombre}
                </option>
              ))}
            </select>
            
            <input 
              type="number" 
              name="personas"
              placeholder="Número de personas en la vivienda *" 
              value={formData.personas}
              onChange={handleChange}
              min="1"
              required
            />
            
            <input 
              type="number" 
              name="superficie1"
              placeholder="Superficie primer piso - m² *" 
              value={formData.superficie1}
              onChange={handleChange}
              min="0.1"
              step="0.1"
              required
            />

            <div className="superficie-container">
              <input 
                type="number" 
                name="superficie2"
                placeholder="Superficie segundo piso - m² (0 si no tiene)" 
                value={formData.superficie2}
                onChange={handleChange}
                min="0"
                step="0.1"
              />
              <button 
                type="button" 
                className="btn-sin-segundo-piso"
                onClick={handleSinSegundoPiso}
              >
                No tengo segundo piso
              </button>
            </div>

            <button 
              type="submit" 
              className="btn-registrar"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
            
            <div className="login-link">
              ¿Ya tienes cuenta? <Link to="/inicio-sesion">Inicia sesión</Link>
            </div>

            <div className="campos-obligatorios">
              * Campos obligatorios
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Registro;