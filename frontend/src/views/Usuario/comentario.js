// views/Usuario/comentario.js
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import '../styles.css';

function Comentario() {
  const [formData, setFormData] = useState({
    tipoComentario: '',
    mensaje: ''
  });

  const [usuario, setUsuario] = useState({
    nombre: '',
    email: '',
    id: null
  });

  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [servidorConectado, setServidorConectado] = useState(false);

  // Verificar conexión con el servidor
  useEffect(() => {
    const verificarServidor = async () => {
      try {
        console.log('🔍 Verificando conexión con el servidor...');
        const response = await fetch('http://localhost:5000/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Servidor conectado:', result);
          setServidorConectado(true);
        } else {
          console.error('❌ Servidor respondió con error');
          setServidorConectado(false);
        }
      } catch (error) {
        console.error('❌ No se pudo conectar al servidor:', error);
        setServidorConectado(false);
        setError('No se puede conectar al servidor. Verifica que esté ejecutándose en http://localhost:5000');
      }
    };

    verificarServidor();
  }, []);

  // Obtener datos del usuario desde localStorage
  useEffect(() => {
    const obtenerUsuario = () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');

        console.log('🔍 DEBUG - Datos del usuario desde localStorage:', userData);
        
        if (!token || !userData.id) {
          console.error('❌ No hay usuario autenticado');
          window.location.href = '/login';
          return;
        }

        setUsuario({
          nombre: userData.nombre_completo || userData.nombre || 'Usuario',
          email: userData.correo || userData.email || '',
          id: userData.id || userData.userId || null
        });

      } catch (error) {
        console.error('❌ Error al obtener datos del usuario:', error);
        setError('Error al cargar información del usuario');
        window.location.href = '/login';
      }
    };

    obtenerUsuario();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!servidorConectado) {
      setError('El servidor no está disponible. Por favor, verifica que el backend esté ejecutándose.');
      return;
    }

    setCargando(true);
    setError('');

    if (!usuario.id) {
      setError('No se pudo obtener la información del usuario. Por favor, recarga la página.');
      setCargando(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!token) {
        setError('No estás autenticado. Por favor, inicia sesión nuevamente.');
        window.location.href = '/login';
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('http://localhost:5000/api/comentarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tipoComentario: formData.tipoComentario,
          mensaje: formData.mensaje
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.ok && result.success) {
        setEnviado(true);
        setFormData({
          tipoComentario: '',
          mensaje: ''
        });
      } else {
        const errorMsg = result.error || `Error ${response.status} al enviar comentario`;
        setError(errorMsg);
        
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('❌ Error de conexión completo:', error);
      if (error.name === 'AbortError') {
        setError('El servidor tardó demasiado en responder. Verifica que esté funcionando correctamente.');
      } else {
        setError(`Error de conexión: ${error.message}. Verifica que el servidor esté corriendo en http://localhost:5000`);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleNuevoComentario = () => {
    setEnviado(false);
    setError('');
  };

  const handleReintentarConexion = async () => {
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        setServidorConectado(true);
        setError('');
      }
    } catch (error) {
      setServidorConectado(false);
      setError('Servidor aún no disponible.');
    }
  };

  return (
    <Layout>
      <div className="form-container">
        <div className="form-header">
          <h1 className="form-title">Enviar Comentario</h1>
          <p className="form-subtitle">
            Tu opinión es importante para nosotros. Los comentarios son privados y solo visibles para el equipo administrativo.
          </p>
        </div>

        {!servidorConectado && (
          <div className="error-message servidor-error">
            <strong>⚠️ Servidor no conectado</strong>
            <br />
            <button 
              onClick={handleReintentarConexion}
              className="btn-reintentar"
            >
              Reintentar conexión
            </button>
          </div>
        )}

        {error && servidorConectado && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="usuario-info-card">
          <h3 className="usuario-info-title">
            <span className="usuario-icon">👤</span> Información de tu cuenta
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <strong className="info-label">Nombre:</strong>
              <span className="info-value">{usuario.nombre || 'No disponible'}</span>
            </div>
            <div className="info-item">
              <strong className="info-label">Email:</strong>
              <span className="info-value">{usuario.email || 'No disponible'}</span>
            </div>
          </div>
        </div>

        {enviado ? (
          <div className="mensaje-exito comentario-exito">
            <div className="icono-exito">✓</div>
            <h2 className="exito-titulo">¡Comentario Enviado!</h2>
            <p className="exito-mensaje">
              Gracias por tu feedback. Hemos recibido tu comentario y lo revisaremos pronto.
            </p>
            <button 
              className="submit-btn btn-centrado"
              onClick={handleNuevoComentario}
            >
              Enviar otro comentario
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-section comentario-section">
              <h2 className="seccion-titulo">
                <span className="seccion-icono">💬</span> Tu Comentario
              </h2>
              
              <div className="input-group">
                <label htmlFor="tipoComentario" className="input-label">
                  Tipo de Comentario *
                </label>
                <select
                  id="tipoComentario"
                  name="tipoComentario"
                  value={formData.tipoComentario}
                  onChange={handleChange}
                  required
                  className="form-select"
                  disabled={!usuario.id || cargando || !servidorConectado}
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="sugerencia">💡 Sugerencia</option>
                  <option value="problema">🐛 Reportar un problema</option>
                  <option value="mejora">🚀 Idea de mejora</option>
                  <option value="felicitacion">🎉 Felicitación</option>
                  <option value="otro">📝 Otro</option>
                </select>
              </div>

              <div className="input-group textarea-group">
                <label htmlFor="mensaje" className="input-label">
                  Mensaje *
                </label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  placeholder="Describe tu comentario, sugerencia o problema..."
                  rows="6"
                  value={formData.mensaje}
                  onChange={handleChange}
                  required
                  disabled={!usuario.id || cargando || !servidorConectado}
                  className="textarea-mensaje"
                />
              </div>
            </div>

            <div className="form-nota">
              <p className="nota-titulo">
                <span className="nota-icono">ℹ️</span> Información importante:
              </p>
              <ul className="nota-lista">
                <li>Los comentarios son revisados exclusivamente por el equipo administrativo</li>
                <li>No es posible ver, editar o eliminar comentarios una vez enviados</li>
                <li>No puedes acceder a los comentarios de otros usuarios</li>
                {cargando && (
                  <li className="cargando-item">
                    ⏳ Procesando tu comentario...
                  </li>
                )}
              </ul>
            </div>

            <div className="btn-container">
              <button 
                type="submit" 
                className="submit-btn btn-centrado"
                disabled={cargando || !usuario.id || !servidorConectado}
              >
                {!servidorConectado ? 'Servidor no disponible' : 
                 cargando ? 'Enviando...' : 
                 !usuario.id ? 'Cargando información...' : 'Enviar Comentario'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}

export default Comentario;