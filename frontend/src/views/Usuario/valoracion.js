// views/Usuario/valoracion.js
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import NotificationContainer from '../../components/NotificationContainer';
import { useNotification } from '../../hooks/useNotification';
import '../styles.css';

function Valoracion() {
  const [puntuacion, setPuntuacion] = useState(0);
  const [puntuacionTemporal, setPuntuacionTemporal] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [servidorConectado, setServidorConectado] = useState(false);
  const [yaValoroHoy, setYaValoroHoy] = useState(false);
  const [errores, setErrores] = useState({});

  const [estadisticas, setEstadisticas] = useState({
    promedio: 0,
    totalValoraciones: 0,
    distribucion: [0, 0, 0, 0, 0]
  });

  // Usar el hook de notificaciones
  const { notifications, removeNotification, showSuccess, showError, showInfo, showWarning } = useNotification();

  useEffect(() => {
    const inicializar = async () => {
      try {
        const healthResponse = await fetch('http://localhost:5000/api/health');
        if (healthResponse.ok) {
          setServidorConectado(true);
          await cargarEstadisticas();
          await verificarValoracionHoy();
        }
      } catch (error) {
        console.error('Error inicializando:', error);
        setServidorConectado(false);
      }
    };

    inicializar();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/valoraciones/estadisticas');
      const result = await response.json();

      if (result.success) {
        setEstadisticas(result.estadisticas);
      } else {
        console.error('Error al cargar estadísticas:', result.error);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const verificarValoracionHoy = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/valoraciones/mi-valoracion-hoy', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setYaValoroHoy(result.yaValoroHoy);
        if (result.yaValoroHoy) {
          setEnviado(true);
        }
      }
    } catch (error) {
      console.error('Error verificando valoración:', error);
    }
  };

  const manejarHover = (valor) => {
    setPuntuacionTemporal(valor);
  };

  const manejarSalidaHover = () => {
    setPuntuacionTemporal(0);
  };

  const manejarClicEstrella = (valor) => {
    setPuntuacion(valor);
    // Limpiar error de puntuación cuando se selecciona
    if (errores.puntuacion) {
      setErrores(prev => ({ ...prev, puntuacion: '' }));
    }
  };

  const manejarCambioFeedback = (e) => {
    setFeedback(e.target.value);
    // Limpiar error de feedback cuando se empieza a escribir
    if (errores.feedback) {
      setErrores(prev => ({ ...prev, feedback: '' }));
    }
    if (error) setError('');
  };

  const manejarEnviarValoracion = async (e) => {
    e.preventDefault();
    
    // Validar antes de enviar - CAPTURAR LOS ERRORES INMEDIATAMENTE
    const nuevosErrores = {};
    
    // Validar campos obligatorios
    if (puntuacion === 0) {
      nuevosErrores.puntuacion = 'Por favor selecciona una puntuación con las estrellas';
    }

    if (!feedback.trim()) {
      nuevosErrores.feedback = 'El campo de feedback no puede estar vacío. Comparte tu experiencia con nosotros.';
    } else if (feedback.trim().length < 10) {
      nuevosErrores.feedback = 'Por favor escribe al menos 10 caracteres para tu feedback';
    }

    // Actualizar errores inmediatamente
    setErrores(nuevosErrores);
    
    if (Object.keys(nuevosErrores).length > 0) {
      // Mostrar mensaje específico según el tipo de error
      if (nuevosErrores.feedback) {
        showError(nuevosErrores.feedback);
      } else if (nuevosErrores.puntuacion) {
        showError(nuevosErrores.puntuacion);
      }
      return;
    }

    setCargando(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showError('No estás autenticado. Por favor, inicia sesión nuevamente.');
        window.location.href = '/login';
        return;
      }

      const response = await fetch('http://localhost:5000/api/valoraciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          puntuacion: puntuacion,
          feedback: feedback.trim()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEnviado(true);
        setPuntuacion(0);
        setFeedback('');
        setYaValoroHoy(true);
        await cargarEstadisticas();
        showSuccess('¡Valoración enviada exitosamente!');
      } else {
        const errorMsg = result.error || 'Error al enviar la valoración';
        showError(errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = 'Error de conexión. Verifica que el servidor esté funcionando.';
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setCargando(false);
    }
  };

  const manejarNuevaValoracion = () => {
    setEnviado(false);
    setPuntuacion(0);
    setFeedback('');
    setYaValoroHoy(false);
    setErrores({});
    showInfo('Puedes enviar una nueva valoración');
  };

  const calcularPorcentaje = (cantidad) => {
    if (estadisticas.totalValoraciones === 0) return 0;
    return (cantidad / estadisticas.totalValoraciones) * 100;
  };

  const handleReintentarConexion = async () => {
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        setServidorConectado(true);
        await cargarEstadisticas();
        showSuccess('Conexión al servidor restaurada');
      }
    } catch (error) {
      setServidorConectado(false);
      showError('No se pudo conectar al servidor');
    }
  };

  return (
    <Layout>
      {/* Contenedor de notificaciones */}
      <NotificationContainer 
        notifications={notifications}
        onCloseNotification={removeNotification}
      />
      
      <div className="form-container">
        <div className="form-header">
          <h1 className="form-title">Valorar Aplicación</h1>
          <p className="form-subtitle">
            Tu opinión nos ayuda a mejorar. Califica tu experiencia con la aplicación.
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

        <div className="estadisticas-valoracion">
          <div className="puntuacion-promedio">
            <div className="numero-promedio">{estadisticas.promedio.toFixed(1)}</div>
            <div className="estrellas-promedio">
              {'★'.repeat(Math.floor(estadisticas.promedio))}
              {estadisticas.promedio % 1 >= 0.5 ? '⭐' : ''}
              {'☆'.repeat(5 - Math.ceil(estadisticas.promedio))}
            </div>
            <div className="total-valoraciones">
              📊 {estadisticas.totalValoraciones} valoraciones
            </div>
          </div>

          <div className="distribucion-valoraciones">
            <h3 className="distribucion-titulo">
              <span>📈</span> Distribución de valoraciones
            </h3>
            {[5, 4, 3, 2, 1].map(estrellas => (
              <div key={estrellas} className="fila-distribucion">
                <span className="texto-estrellas">
                  {estrellas} <span className="estrella-icono">★</span>
                </span>
                <div className="barra-contenedor">
                  <div 
                    className="barra-progreso"
                    style={{ 
                      width: `${calcularPorcentaje(estadisticas.distribucion[estrellas-1])}%` 
                    }}
                  >
                    {estadisticas.distribucion[estrellas-1] > 0 && `${calcularPorcentaje(estadisticas.distribucion[estrellas-1]).toFixed(0)}%`}
                  </div>
                </div>
                <span className="porcentaje">
                  {estadisticas.distribucion[estrellas-1]} ({calcularPorcentaje(estadisticas.distribucion[estrellas-1]).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {yaValoroHoy ? (
          <div className="mensaje-exito valoracion-exito">
            <div className="icono-exito">⭐</div>
            <h2 className="exito-titulo">¡Ya valoraste hoy!</h2>
            <p className="exito-mensaje">
              Gracias por tu feedback. Ya has enviado una valoración hoy.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <button 
                className="submit-btn btn-volver"
                onClick={manejarNuevaValoracion}
              >
                Volver
              </button>
            )}
          </div>
        ) : enviado ? (
          <div className="mensaje-exito valoracion-exito">
            <div className="icono-exito">⭐</div>
            <h2 className="exito-titulo">¡Valoración Enviada!</h2>
            <p className="exito-mensaje">
              Gracias por tu feedback. Tu valoración ha sido registrada exitosamente.
            </p>
            <button 
              className="submit-btn btn-centrado"
              onClick={manejarNuevaValoracion}
            >
              Enviar otra valoración
            </button>
          </div>
        ) : (
          <form onSubmit={manejarEnviarValoracion}>
            <div className="form-section valoracion-section">
              <h2 className="seccion-titulo">
                <span className="seccion-icono">⭐</span> Tu Valoración
              </h2>
              
              <div className="selector-estrellas">
                <div 
                  className="contenedor-estrellas"
                  onMouseLeave={manejarSalidaHover}
                >
                  {[1, 2, 3, 4, 5].map(estrella => (
                    <button
                      key={estrella}
                      type="button"
                      className={`estrella-btn ${
                        estrella <= (puntuacionTemporal || puntuacion) ? 'activa' : ''
                      }`}
                      onMouseEnter={() => manejarHover(estrella)}
                      onClick={() => manejarClicEstrella(estrella)}
                      disabled={!servidorConectado}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {errores.puntuacion && (
                  <div className="error-mensaje-campo" style={{textAlign: 'center', marginTop: '10px'}}>
                    {errores.puntuacion}
                  </div>
                )}
                <div className={`texto-puntuacion ${puntuacion === 0 ? 'sin-puntuacion' : 'con-puntuacion'}`}>
                  {puntuacion === 0 ? '🎯 Selecciona una puntuación' : `⭐ ${puntuacion} de 5 estrellas`}
                </div>
              </div>

              <div className="feedback-container">
                <h3 className="feedback-titulo">
                  <span>💭</span> Tu feedback nos ayuda a entender qué estamos haciendo bien y en qué podemos mejorar.
                </h3>
                <p className="feedback-subtitulo">
                  ¿Nos compartirías qué te llevó a esta valoración?
                </p>
                <textarea
                  name="feedback"
                  placeholder="Describe tu experiencia, qué te gustó, qué podemos mejorar..."
                  rows="6"
                  value={feedback}
                  onChange={manejarCambioFeedback}
                  required
                  disabled={!servidorConectado}
                  className={`textarea-feedback ${errores.feedback ? 'error-input' : ''}`}
                  style={{
                    border: errores.feedback ? '2px solid #e74c3c' : '2px solid #e0e0e0',
                    backgroundColor: errores.feedback ? '#fee' : 'white'
                  }}
                />
                {errores.feedback && (
                  <div className="error-mensaje-campo" style={{
                    color: '#e74c3c',
                    fontSize: '13px',
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#fee',
                    border: '1px solid #e74c3c',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>⚠️</span>
                    <span>{errores.feedback}</span>
                  </div>
                )}
                {/* Mostrar contador de caracteres */}
                {feedback.length > 0 && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: feedback.length < 10 ? '#e74c3c' : '#27ae60',
                    marginTop: '5px',
                    textAlign: 'right',
                    fontWeight: feedback.length < 10 ? 'bold' : 'normal'
                  }}>
                    {feedback.length}/10 caracteres mínimos
                  </div>
                )}
              </div>
            </div>

            <div className="form-nota">
              <p className="nota-titulo">
                <span className="nota-icono">ℹ️</span> Información importante:
              </p>
              <ul className="nota-lista">
                <li>Las valoraciones son anónimas para otros usuarios</li>
                <li>Solo puedes enviar una valoración por día</li>
                <li>El feedback debe tener al menos 10 caracteres</li>
                {cargando && (
                  <li className="cargando-item">
                    ⏳ Enviando tu valoración...
                  </li>
                )}
              </ul>
            </div>

            <div className="btn-container">
              <button 
                type="submit" 
                className="submit-btn btn-centrado"
              >
                {!servidorConectado ? 'Servidor no disponible' :
                 cargando ? 'Enviando...' : 
                 'Enviar Valoración'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}

export default Valoracion;