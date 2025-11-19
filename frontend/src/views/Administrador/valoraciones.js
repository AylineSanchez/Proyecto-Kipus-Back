// views/Administrador/valoraciones.js
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout_Admin';
import '../styles.css';

function ValoracionesAdministrador() {
  const [valoraciones, setValoraciones] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    promedio: 0,
    totalValoraciones: 0,
    distribucion: [0, 0, 0, 0, 0]
  });
  const [filtros, setFiltros] = useState({
    puntuacion: 'todas',
    fechaInicio: '',
    fechaFin: ''
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Cargar valoraciones y estadísticas
  useEffect(() => {
    cargarValoraciones();
  }, []);

  const cargarValoraciones = async () => {
    try {
      setCargando(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No estás autenticado');
        setCargando(false);
        return;
      }

      // Cargar estadísticas
      const statsResponse = await fetch('http://localhost:5000/api/valoraciones/estadisticas');
      const statsResult = await statsResponse.json();

      if (statsResult.success) {
        setEstadisticas(statsResult.estadisticas);
      } else {
        setError('Error al cargar estadísticas');
      }

      // Cargar valoraciones detalladas
      const valResponse = await fetch('http://localhost:5000/api/admin/valoraciones', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!valResponse.ok) {
        throw new Error(`Error HTTP: ${valResponse.status}`);
      }

      const valResult = await valResponse.json();

      if (valResult.success) {
        setValoraciones(valResult.data || []);
      } else {
        setError(valResult.error || 'Error al cargar valoraciones');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión al servidor: ' + error.message);
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

  const filtrarValoraciones = () => {
    let filtradas = [...valoraciones];

    if (filtros.puntuacion !== 'todas') {
      filtradas = filtradas.filter(valoracion => 
        valoracion.valor === parseInt(filtros.puntuacion)
      );
    }

    if (filtros.fechaInicio) {
      const fechaInicio = new Date(filtros.fechaInicio);
      fechaInicio.setHours(0, 0, 0, 0);
      filtradas = filtradas.filter(valoracion => 
        new Date(valoracion.fecha) >= fechaInicio
      );
    }

    if (filtros.fechaFin) {
      const fechaFin = new Date(filtros.fechaFin);
      fechaFin.setHours(23, 59, 59, 999);
      filtradas = filtradas.filter(valoracion => 
        new Date(valoracion.fecha) <= fechaFin
      );
    }

    return filtradas;
  };

  const calcularPorcentaje = (cantidad) => {
    if (estadisticas.totalValoraciones === 0) return 0;
    return (cantidad / estadisticas.totalValoraciones) * 100;
  };

  const limpiarFiltros = () => {
    setFiltros({
      puntuacion: 'todas',
      fechaInicio: '',
      fechaFin: ''
    });
  };

  const valoracionesFiltradas = filtrarValoraciones();

  return (
    <Layout>
      <div className="form-container">
        <div className="form-header">
          <h1 className="form-title">Gestión de Valoraciones</h1>
          <p className="form-subtitle">
            Revisa las valoraciones y feedback de los usuarios
          </p>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <div className="error-message">
            <div className="error-icono">❌</div>
            {error}
            <button 
              onClick={cargarValoraciones}
              className="btn-reintentar"
            >
              🔄 Reintentar
            </button>
          </div>
        )}

        {/* Estadísticas con distribución original */}
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

        {/* Filtros Mejorados */}
        <div className="filtros-section">
          <div className="filtros-header">
            <h3>Filtros de Valoraciones</h3>
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
                <label htmlFor="puntuacion">
                  <span className="label-icon">⭐</span>
                  Puntuación
                </label>
                <select
                  id="puntuacion"
                  name="puntuacion"
                  value={filtros.puntuacion}
                  onChange={handleFiltroChange}
                  className="filtro-select"
                >
                  <option value="todas">⭐ Todas las puntuaciones</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 Estrellas</option>
                  <option value="4">⭐⭐⭐⭐ 4 Estrellas</option>
                  <option value="3">⭐⭐⭐ 3 Estrellas</option>
                  <option value="2">⭐⭐ 2 Estrellas</option>
                  <option value="1">⭐ 1 Estrella</option>
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
                className={`btn-filtro ${filtros.puntuacion === 'todas' ? 'activo' : ''}`}
                onClick={() => setFiltros({...filtros, puntuacion: 'todas'})}
              >
                <span className="btn-icon">🔄</span>
                Todas ({valoraciones.length})
              </button>
              <button 
                className={`btn-filtro ${filtros.puntuacion === '5' ? 'activo' : ''}`}
                onClick={() => setFiltros({...filtros, puntuacion: '5'})}
              >
                <span className="btn-icon">⭐⭐⭐⭐⭐</span>
                5 Estrellas
              </button>
              <button 
                className={`btn-filtro ${filtros.puntuacion === '4' ? 'activo' : ''}`}
                onClick={() => setFiltros({...filtros, puntuacion: '4'})}
              >
                <span className="btn-icon">⭐⭐⭐⭐</span>
                4 Estrellas
              </button>
              <button 
                className={`btn-filtro ${filtros.puntuacion === '3' ? 'activo' : ''}`}
                onClick={() => setFiltros({...filtros, puntuacion: '3'})}
              >
                <span className="btn-icon">⭐⭐⭐</span>
                3 Estrellas
              </button>
            </div>
          </div>
          
          {/* Información de filtros aplicados */}
          {(filtros.puntuacion !== 'todas' || filtros.fechaInicio || filtros.fechaFin) && (
            <div className="filtros-activos">
              <strong>Filtros activos:</strong>
              {filtros.puntuacion !== 'todas' && (
                <span className="filtro-activo">
                  Puntuación: {filtros.puntuacion} estrellas ⭐
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

        {/* Lista de Valoraciones - UNA SOLA COLUMNA */}
        <div className="valoraciones-lista">
          <div className="lista-header">
            <h3>
              Valoraciones ({valoracionesFiltradas.length})
            </h3>
            <div className="contador-filtrado">
              {valoracionesFiltradas.length !== valoraciones.length && (
                <span className="filtrado-info">
                  Mostrando {valoracionesFiltradas.length} de {valoraciones.length} valoraciones
                </span>
              )}
            </div>
          </div>

          {cargando ? (
            <div className="cargando">
              <div className="cargando-icono">⏳</div>
              Cargando valoraciones...
            </div>
          ) : valoracionesFiltradas.length === 0 ? (
            <div className="sin-datos">
              <div className="sin-datos-icono">📭</div>
              {valoraciones.length === 0 
                ? 'No hay valoraciones registradas en el sistema' 
                : 'No hay valoraciones que coincidan con los filtros seleccionados'
              }
            </div>
          ) : (
            <div className="valoraciones-lista-unica-columna">
              {valoracionesFiltradas.map(valoracion => (
                <div key={valoracion.id} className="valoracion-card">
                  <div className="valoracion-header">
                    <div className="valoracion-estrellas">
                      {[1, 2, 3, 4, 5].map(estrella => (
                        <span
                          key={estrella}
                          className={`estrella ${estrella <= valoracion.valor ? 'activa' : ''}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <div className="valoracion-fecha">
                      <span className="fecha-icono">📅</span>
                      {new Date(valoracion.fecha).toLocaleDateString('es-CL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div className="valoracion-feedback">
                    <p>{valoracion.feedback || 'Sin comentario adicional'}</p>
                  </div>

                  <div className="valoracion-usuario">
                    <div className="usuario-info">
                      <span className="usuario-icono">👤</span>
                      <strong>{valoracion.nombre_completo || 'Usuario'}</strong>
                    </div>
                    <div className="usuario-contacto">
                      <span className="email-icono">📧</span>
                      <span>{valoracion.correo || 'Sin email'}</span>
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

export default ValoracionesAdministrador;