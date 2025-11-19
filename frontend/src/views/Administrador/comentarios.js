// views/Administrador/comentarios.js
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout_Admin';
import '../styles.css';

function ComentariosAdministrador() {
  const [comentarios, setComentarios] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    porTipo: {},
    ultimaSemana: 0
  });
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    fechaInicio: '',
    fechaFin: ''
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Cargar comentarios y estadísticas
  useEffect(() => {
    cargarComentarios();
  }, []);

  const cargarComentarios = async () => {
    try {
      setCargando(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No estás autenticado');
        setCargando(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/admin/comentarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setComentarios(result.data.comentarios || []);
        setEstadisticas({
          total: result.data.estadisticas?.total || 0,
          porTipo: result.data.estadisticas?.porTipo || {},
          ultimaSemana: result.data.estadisticas?.ultimaSemana || 0
        });
      } else {
        setError(result.error || 'Error al cargar comentarios');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión al servidor');
    } finally {
      setCargando(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filtrarComentarios = () => {
    let filtrados = [...comentarios];

    if (filtros.tipo !== 'todos') {
      filtrados = filtrados.filter(comentario => comentario.tipo === filtros.tipo);
    }

    if (filtros.fechaInicio) {
      const fechaInicio = new Date(filtros.fechaInicio);
      fechaInicio.setHours(0, 0, 0, 0);
      filtrados = filtrados.filter(comentario => 
        new Date(comentario.fecha) >= fechaInicio
      );
    }

    if (filtros.fechaFin) {
      const fechaFin = new Date(filtros.fechaFin);
      fechaFin.setHours(23, 59, 59, 999);
      filtrados = filtrados.filter(comentario => 
        new Date(comentario.fecha) <= fechaFin
      );
    }

    return filtrados;
  };

  const obtenerNombreTipo = (tipo) => {
    const nombres = {
      sugerencia: 'Sugerencia',
      problema: 'Problema',
      mejora: 'Idea de Mejora',
      felicitacion: 'Felicitación',
      otro: 'Otro'
    };
    return nombres[tipo] || tipo;
  };

  const obtenerIconoTipo = (tipo) => {
    const iconos = {
      sugerencia: '💡',
      problema: '⚠️',
      mejora: '🚀',
      felicitacion: '⭐',
      otro: '📝'
    };
    return iconos[tipo] || '📄';
  };

  const obtenerColorTipo = (tipo) => {
    const colores = {
      sugerencia: '#3498db',
      problema: '#e74c3c',
      mejora: '#9b59b6',
      felicitacion: '#f1c40f',
      otro: '#95a5a6'
    };
    return colores[tipo] || '#95a5a6';
  };

  const calcularPorcentajeTipo = (tipo) => {
    if (!estadisticas.porTipo || estadisticas.total === 0) return 0;
    const cantidad = estadisticas.porTipo[tipo] || 0;
    return (cantidad / estadisticas.total) * 100;
  };

  const limpiarFiltros = () => {
    setFiltros({
      tipo: 'todos',
      fechaInicio: '',
      fechaFin: ''
    });
  };

  const comentariosFiltrados = filtrarComentarios();

  // Obtener tipos de comentarios existentes para el gráfico
  const tiposComentarios = estadisticas.porTipo ? Object.keys(estadisticas.porTipo) : [];

  return (
    <Layout>
      <div className="form-container">
        <div className="form-header">
          <h1 className="form-title">Gestión de Comentarios</h1>
          <p className="form-subtitle">
            Revisa y gestiona los comentarios enviados por los usuarios
          </p>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <div className="error-message">
            <div className="error-icono">❌</div>
            {error}
            <button 
              onClick={cargarComentarios}
              className="btn-reintentar"
            >
              🔄 Reintentar
            </button>
          </div>
        )}

        {/* Estadísticas con distribución similar a valoraciones */}
        <div className="estadisticas-valoracion">
          <div className="puntuacion-promedio">
            <div className="numero-promedio">{estadisticas.total}</div>
            <div className="estrellas-promedio">
              💬 Total Comentarios
            </div>
            <div className="total-valoraciones">
              📅 {estadisticas.ultimaSemana} esta semana
            </div>
          </div>

          <div className="distribucion-valoraciones">
            <h3 className="distribucion-titulo">
              <span>📊</span> Distribución por Tipo
            </h3>
            {tiposComentarios.length > 0 ? (
              tiposComentarios.map((tipo) => (
                <div key={tipo} className="fila-distribucion">
                  <span className="texto-estrellas">
                    {obtenerIconoTipo(tipo)} {obtenerNombreTipo(tipo)}
                  </span>
                  <div className="barra-contenedor">
                    <div 
                      className="barra-progreso"
                      style={{ 
                        width: `${calcularPorcentajeTipo(tipo)}%`,
                        backgroundColor: obtenerColorTipo(tipo)
                      }}
                    >
                      {estadisticas.porTipo[tipo] > 0 && `${calcularPorcentajeTipo(tipo).toFixed(0)}%`}
                    </div>
                  </div>
                  <span className="porcentaje">
                    {estadisticas.porTipo[tipo]} ({calcularPorcentajeTipo(tipo).toFixed(0)}%)
                  </span>
                </div>
              ))
            ) : (
              <div className="sin-datos-grafico">
                <p>No hay datos suficientes para mostrar la distribución</p>
              </div>
            )}
          </div>
        </div>

        {/* Filtros Mejorados */}
        <div className="filtros-section">
          <div className="filtros-header">
            <h3>Filtros de Comentarios</h3>
            <button 
              className="btn-limpiar-filtros"
              onClick={limpiarFiltros}
            >
              🧹 Limpiar Filtros
            </button>
          </div>
          
          <div className="filtros-content">
            <div className="filtros-grid">
              <div className="filtro-group">
                <label htmlFor="tipo">
                  <span className="label-icon">🎯</span>
                  Tipo de Comentario
                </label>
                <select
                  id="tipo"
                  name="tipo"
                  value={filtros.tipo}
                  onChange={handleFiltroChange}
                  className="filtro-select"
                >
                  <option value="todos">📋 Todos los tipos</option>
                  <option value="sugerencia">💡 Sugerencia</option>
                  <option value="problema">⚠️ Problema</option>
                  <option value="mejora">🚀 Idea de Mejora</option>
                  <option value="felicitacion">⭐ Felicitación</option>
                  <option value="otro">📝 Otro</option>
                </select>
              </div>

              <div className="filtro-group">
                <label htmlFor="fechaInicio">
                  <span className="label-icon">📅</span>
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  id="fechaInicio"
                  name="fechaInicio"
                  value={filtros.fechaInicio}
                  onChange={handleFiltroChange}
                  className="filtro-input"
                />
              </div>

              <div className="filtro-group">
                <label htmlFor="fechaFin">
                  <span className="label-icon">📅</span>
                  Fecha Fin
                </label>
                <input
                  type="date"
                  id="fechaFin"
                  name="fechaFin"
                  value={filtros.fechaFin}
                  onChange={handleFiltroChange}
                  className="filtro-input"
                />
              </div>
            </div>
            
            {/* Botones de acción de filtros */}
            <div className="filtros-actions">
              <button 
                className={`btn-filtro ${filtros.tipo === 'todos' ? 'activo' : ''}`}
                onClick={() => setFiltros({...filtros, tipo: 'todos'})}
              >
                <span className="btn-icon">🔄</span>
                Todos ({comentarios.length})
              </button>
              <button 
                className={`btn-filtro ${filtros.tipo === 'sugerencia' ? 'activo' : ''}`}
                onClick={() => setFiltros({...filtros, tipo: 'sugerencia'})}
              >
                <span className="btn-icon">💡</span>
                Sugerencias
              </button>
              <button 
                className={`btn-filtro ${filtros.tipo === 'problema' ? 'activo' : ''}`}
                onClick={() => setFiltros({...filtros, tipo: 'problema'})}
              >
                <span className="btn-icon">⚠️</span>
                Problemas
              </button>
              <button 
                className={`btn-filtro ${filtros.tipo === 'felicitacion' ? 'activo' : ''}`}
                onClick={() => setFiltros({...filtros, tipo: 'felicitacion'})}
              >
                <span className="btn-icon">⭐</span>
                Felicitaciones
              </button>
            </div>
          </div>
          
          {/* Información de filtros aplicados */}
          {(filtros.tipo !== 'todos' || filtros.fechaInicio || filtros.fechaFin) && (
            <div className="filtros-activos">
              <strong>Filtros activos:</strong>
              {filtros.tipo !== 'todos' && (
                <span className="filtro-activo">
                  Tipo: {obtenerNombreTipo(filtros.tipo)} {obtenerIconoTipo(filtros.tipo)}
                </span>
              )}
              {filtros.fechaInicio && (
                <span className="filtro-activo">
                  Desde: {new Date(filtros.fechaInicio).toLocaleDateString('es-CL')}
                </span>
              )}
              {filtros.fechaFin && (
                <span className="filtro-activo">
                  Hasta: {new Date(filtros.fechaFin).toLocaleDateString('es-CL')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Lista de Comentarios - UNA SOLA COLUMNA */}
        <div className="comentarios-lista">
          <div className="lista-header">
            <h3>
              Comentarios ({comentariosFiltrados.length})
            </h3>
            <div className="contador-filtrado">
              {comentariosFiltrados.length !== comentarios.length && (
                <span className="filtrado-info">
                  Mostrando {comentariosFiltrados.length} de {comentarios.length} comentarios
                </span>
              )}
            </div>
          </div>

          {cargando ? (
            <div className="cargando">
              <div className="cargando-icono">⏳</div>
              Cargando comentarios...
            </div>
          ) : comentariosFiltrados.length === 0 ? (
            <div className="sin-datos">
              <div className="sin-datos-icono">📭</div>
              {comentarios.length === 0 
                ? 'No hay comentarios registrados en el sistema' 
                : 'No hay comentarios que coincidan con los filtros seleccionados'
              }
            </div>
          ) : (
            <div className="comentarios-lista-unica-columna">
              {comentariosFiltrados.map(comentario => (
                <div key={comentario.id} className="comentario-card">
                  <div className="comentario-header">
                    <div className="comentario-tipo">
                      <span 
                        className="comentario-icono"
                        style={{ color: obtenerColorTipo(comentario.tipo) }}
                      >
                        {obtenerIconoTipo(comentario.tipo)}
                      </span>
                      <span 
                        className="badge-tipo"
                        style={{ 
                          backgroundColor: obtenerColorTipo(comentario.tipo),
                          color: 'white'
                        }}
                      >
                        {obtenerNombreTipo(comentario.tipo)}
                      </span>
                    </div>
                    <div className="comentario-fecha">
                      <span className="fecha-icono">📅</span>
                      {new Date(comentario.fecha).toLocaleDateString('es-CL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div className="comentario-contenido">
                    <p>{comentario.descripcion}</p>
                  </div>

                  <div className="comentario-usuario">
                    <div className="usuario-info">
                      <span className="usuario-icono">👤</span>
                      <strong>{comentario.nombre_completo || 'Usuario'}</strong>
                    </div>
                    <div className="usuario-contacto">
                      <span className="email-icono">📧</span>
                      <span>{comentario.correo || 'Sin email'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ComentariosAdministrador;