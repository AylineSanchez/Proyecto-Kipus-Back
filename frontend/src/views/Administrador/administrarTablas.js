// views/Administrador/administrarTablas.js
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout_Admin';
import '../styles.css';
import * as XLSX from 'xlsx';

function AdministrarTablas() {
  const [tablas, setTablas] = useState([]);
  const [tablaSeleccionada, setTablaSeleccionada] = useState('');
  const [datosTabla, setDatosTabla] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [filaEditando, setFilaEditando] = useState(null);
  const [nuevaFila, setNuevaFila] = useState({});
  const [mostrarFormularioAgregar, setMostrarFormularioAgregar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [opcionesRegion, setOpcionesRegion] = useState([]);
  const [opcionesComuna, setOpcionesComuna] = useState([]);

  // Tablas disponibles en el sistema
  const tablasSistema = [
    { nombre: 'usuario', descripcion: 'Usuarios del sistema' },
    { nombre: 'vivienda', descripcion: 'Datos de viviendas' },
    { nombre: 'comentario', descripcion: 'Comentarios de usuarios' },
    { nombre: 'valoracion', descripcion: 'Valoraciones de la aplicación' },
    { nombre: 'region', descripcion: 'Regiones de Chile' },
    { nombre: 'comuna', descripcion: 'Comunas de Chile' },
    { nombre: 'aislante_muro', descripcion: 'Aislantes para muros' },
    { nombre: 'aislante_techo', descripcion: 'Aislantes para techos' },
    { nombre: 'artefacto', descripcion: 'Artefactos de calefacción' },
    { nombre: 'artefacto_ahorro_precio', descripcion: 'Ahorro y precios de artefactos' },
    { nombre: 'combustible', descripcion: 'Combustibles y eficiencia' },
    { nombre: 'muros', descripcion: 'Tipos de muros' },
    { nombre: 'precio_unitario', descripcion: 'Precios unitarios' },
    { nombre: 'precio_unitario_pm', descripcion: 'Precios unitarios por material' },
    { nombre: 'tabla_valores', descripcion: 'Valores técnicos de materiales' },
    { nombre: 'techo', descripcion: 'Tipos de techos' },
    { nombre: 'ventana', descripcion: 'Tipos de ventanas' },
    { nombre: 'muro_solucion', descripcion: 'Soluciones de aislamiento para muros' },
    { nombre: 'techo_solucion', descripcion: 'Soluciones de aislamiento para techos' },
    { nombre: 'ventana_solucion', descripcion: 'Soluciones de ventanas con valores U' }
  ];

  useEffect(() => {
    setTablas(tablasSistema);
  }, []);

  // Cargar opciones de región y comuna cuando se selecciona vivienda
  useEffect(() => {
    const cargarOpciones = async () => {
      if (tablaSeleccionada === 'vivienda') {
        try {
          const token = localStorage.getItem('token');
          
          // Cargar regiones
          const responseRegiones = await fetch('http://localhost:5000/api/admin/tablas/region', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const resultRegiones = await responseRegiones.json();
          if (resultRegiones.success) {
            setOpcionesRegion(resultRegiones.data.registros);
          }

          // Cargar comunas
          const responseComunas = await fetch('http://localhost:5000/api/admin/tablas/comuna', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const resultComunas = await responseComunas.json();
          if (resultComunas.success) {
            setOpcionesComuna(resultComunas.data.registros);
          }
        } catch (error) {
          console.error('Error cargando opciones:', error);
        }
      }
    };
    
    cargarOpciones();
  }, [tablaSeleccionada]);

  // Función auxiliar para obtener el ID de una fila
  const obtenerIdFila = (fila) => {
    if (fila.id !== undefined && fila.id !== null) return fila.id;
    if (fila.id_vivienda !== undefined && fila.id_vivienda !== null) return fila.id_vivienda;
    if (fila.id_usuario !== undefined && fila.id_usuario !== null) return fila.id_usuario;
    if (fila.id_region !== undefined && fila.id_region !== null) return fila.id_region;
    if (fila.id_comuna !== undefined && fila.id_comuna !== null) return fila.id_comuna;
    
    for (let key in fila) {
      if (key.startsWith('id_') && fila[key] !== undefined && fila[key] !== null) {
        return fila[key];
      }
    }
    
    console.warn('No se pudo encontrar ID para fila:', fila);
    return null;
  };

  // Función para procesar datos antes de enviar - CORREGIDA
  const procesarDatosParaEnvio = (datos) => {
    const procesados = { ...datos };
    
    // Convertir campos vacíos a null
    Object.keys(procesados).forEach(key => {
      if (procesados[key] === '') {
        procesados[key] = null;
      }
      
      // Convertir números (excepto para región en vivienda)
      if (typeof procesados[key] === 'string' && !isNaN(procesados[key]) && procesados[key] !== '') {
        // No convertir región si es vivienda (debe mantenerse como texto)
        if (tablaSeleccionada === 'vivienda' && key === 'region') {
          // Mantener como texto
        } else {
          // Verificar si es un número entero o decimal
          if (procesados[key].includes('.')) {
            procesados[key] = parseFloat(procesados[key]);
          } else {
            procesados[key] = parseInt(procesados[key]);
          }
        }
      }
    });
    
    return procesados;
  };

  // Función de debug
  const debugOperacion = (operacion, datos) => {
    console.log(`🔧 DEBUG ${operacion}:`, {
      tabla: tablaSeleccionada,
      datos: datos,
      filaEditando: filaEditando,
      nuevaFila: nuevaFila,
      columnas: columnas
    });
  };

  // FUNCIÓN PARA DESCARGAR TABLA ACTUAL EN EXCEL
  const descargarTablaExcel = async () => {
    if (!tablaSeleccionada || datosTabla.length === 0) {
      setError('No hay datos para descargar');
      return;
    }

    try {
      setDescargandoExcel(true);
      
      const wb = XLSX.utils.book_new();
      
      const datosFormateados = datosTabla.map(fila => {
        const filaFormateada = {};
        columnas.forEach(columna => {
          let valor = fila[columna];
          
          if (valor === null || valor === undefined) {
            valor = '';
          } else if (valor instanceof Date) {
            valor = valor.toLocaleDateString('es-CL');
          } else if (typeof valor === 'boolean') {
            valor = valor ? 'Sí' : 'No';
          } else if (typeof valor === 'number') {
            valor = valor;
          } else {
            valor = String(valor);
          }
          
          filaFormateada[columna] = valor;
        });
        return filaFormateada;
      });

      const ws = XLSX.utils.json_to_sheet(datosFormateados, { header: columnas });
      
      XLSX.utils.book_append_sheet(wb, ws, tablaSeleccionada.substring(0, 31));
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${tablaSeleccionada}_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      setMensaje(`Tabla ${tablaSeleccionada} descargada en formato Excel correctamente`);
      setTimeout(() => setMensaje(''), 3000);
      
    } catch (error) {
      console.error('Error al descargar Excel:', error);
      setError('Error al descargar la tabla en formato Excel');
    } finally {
      setDescargandoExcel(false);
    }
  };

  // FUNCIÓN PARA DESCARGAR TODAS LAS TABLAS EN EXCEL
  const descargarTodasTablasExcel = async () => {
    try {
      setDescargandoExcel(true);
      setMensaje('Preparando descarga de todas las tablas en Excel...');
      
      const token = localStorage.getItem('token');
      
      const wb = XLSX.utils.book_new();
      let tablasConDatos = 0;

      for (const tabla of tablasSistema) {
        try {
          const response = await fetch(`http://localhost:5000/api/admin/tablas/${tabla.nombre}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const result = await response.json();
          
          if (result.success && result.data.registros && result.data.registros.length > 0) {
            const columnas = result.data.columnas || [];
            const datos = result.data.registros;
            
            const datosFormateados = datos.map(fila => {
              const filaFormateada = {};
              columnas.forEach(columna => {
                let valor = fila[columna];
                
                if (valor === null || valor === undefined) {
                  valor = '';
                } else if (valor instanceof Date) {
                  valor = valor.toLocaleDateString('es-CL');
                } else if (typeof valor === 'boolean') {
                  valor = valor ? 'Sí' : 'No';
                } else if (typeof valor === 'number') {
                  valor = valor;
                } else {
                  valor = String(valor);
                }
                
                filaFormateada[columna] = valor;
              });
              return filaFormateada;
            });

            const ws = XLSX.utils.json_to_sheet(datosFormateados, { header: columnas });
            
            const nombreHoja = tabla.nombre.substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
            
            tablasConDatos++;
            console.log(`✅ Tabla ${tabla.nombre} agregada al Excel (${datos.length} registros)`);
          } else {
            const ws = XLSX.utils.aoa_to_sheet([['No hay datos disponibles en esta tabla']]);
            XLSX.utils.book_append_sheet(wb, ws, tabla.nombre.substring(0, 31));
            console.log(`⚠️ Tabla ${tabla.nombre} sin datos`);
          }
        } catch (error) {
          console.error(`Error obteniendo datos de ${tabla.nombre}:`, error);
          const ws = XLSX.utils.aoa_to_sheet([[`Error al cargar datos: ${error.message}`]]);
          XLSX.utils.book_append_sheet(wb, ws, tabla.nombre.substring(0, 31));
        }
      }

      const resumenData = [
        ['RESUMEN DE TABLAS DEL SISTEMA - KIPUS A+'],
        ['Fecha de descarga:', new Date().toLocaleString('es-CL')],
        ['Total de tablas en sistema:', tablasSistema.length],
        ['Tablas con datos descargadas:', tablasConDatos],
        [''],
        ['TABLA', 'DESCRIPCIÓN', 'ESTADO']
      ];

      tablasSistema.forEach(tabla => {
        resumenData.push([tabla.nombre, tabla.descripcion, tablasConDatos > 0 ? 'CON DATOS' : 'SIN DATOS']);
      });

      resumenData.push(
        [''],
        ['Sistema Kipus A+ - Vivienda Sustentable'],
        ['Universidad de Talca']
      );

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `tablas_sistema_completo_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      setMensaje(`✅ ${tablasConDatos} tablas descargadas en formato Excel correctamente`);
      setTimeout(() => setMensaje(''), 5000);
      
    } catch (error) {
      console.error('Error al descargar todas las tablas en Excel:', error);
      setError('Error al descargar todas las tablas en formato Excel');
    } finally {
      setDescargandoExcel(false);
    }
  };

  const cargarDatosTabla = async (nombreTabla) => {
    if (!nombreTabla) return;
    
    try {
      setCargando(true);
      setError('');
      const token = localStorage.getItem('token');

      console.log('📋 Cargando datos de tabla:', nombreTabla);

      const response = await fetch(`http://localhost:5000/api/admin/tablas/${nombreTabla}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      console.log('📦 Respuesta del servidor:', result);

      if (result.success) {
        setDatosTabla(result.data.registros || []);
        setColumnas(result.data.columnas || []);
        setMensaje(`Datos de ${nombreTabla} cargados correctamente`);
        
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setError(result.error || 'Error al cargar datos de la tabla');
        setDatosTabla([]);
        setColumnas([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión al servidor');
      setDatosTabla([]);
      setColumnas([]);
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionarTabla = (tabla) => {
    setTablaSeleccionada(tabla);
    setFilaEditando(null);
    setNuevaFila({});
    setMostrarFormularioAgregar(false);
    setError('');
    setMensaje('');
    cargarDatosTabla(tabla);
  };

  const handleEditarFila = (fila) => {
    setFilaEditando(fila);
    setNuevaFila({ ...fila });
    setError('');
  };

  const handleCancelarEdicion = () => {
    setFilaEditando(null);
    setNuevaFila({});
    setError('');
  };

  const handleGuardarEdicion = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');
      
      const idFila = obtenerIdFila(filaEditando);
      if (!idFila) {
        setError('No se pudo identificar el ID del registro');
        return;
      }

      const datosProcesados = procesarDatosParaEnvio(nuevaFila);
      
      debugOperacion('GUARDAR', datosProcesados);

      console.log('📝 Enviando datos actualizados:', {
        tabla: tablaSeleccionada,
        id: idFila,
        datos: datosProcesados,
        region: datosProcesados.region,
        tipoRegion: typeof datosProcesados.region
      });

      const response = await fetch(`http://localhost:5000/api/admin/tablas/${tablaSeleccionada}/${idFila}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosProcesados)
      });

      const result = await response.json();

      console.log('🔄 Respuesta del servidor (editar):', result);

      if (result.success) {
        const datosActualizados = datosTabla.map(fila => 
          obtenerIdFila(fila) === idFila ? { ...result.data } : fila
        );
        setDatosTabla(datosActualizados);
        setFilaEditando(null);
        setNuevaFila({});
        setMensaje('Registro actualizado correctamente');
        
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setError(result.error || 'Error al actualizar el registro');
      }
    } catch (error) {
      console.error('Error en guardar edición:', error);
      setError('Error de conexión al servidor');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarFila = async (fila) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      return;
    }

    try {
      setCargando(true);
      const token = localStorage.getItem('token');
      
      const idFila = obtenerIdFila(fila);
      if (!idFila) {
        setError('No se pudo identificar el ID del registro');
        return;
      }

      debugOperacion('ELIMINAR', fila);

      console.log('🗑️ Eliminando registro:', {
        tabla: tablaSeleccionada,
        id: idFila
      });

      const response = await fetch(`http://localhost:5000/api/admin/tablas/${tablaSeleccionada}/${idFila}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      console.log('🔄 Respuesta del servidor (eliminar):', result);

      if (result.success) {
        const datosActualizados = datosTabla.filter(f => obtenerIdFila(f) !== idFila);
        setDatosTabla(datosActualizados);
        setMensaje('Registro eliminado correctamente');
        
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setError(result.error || 'Error al eliminar el registro');
      }
    } catch (error) {
      console.error('Error en eliminar fila:', error);
      setError('Error de conexión al servidor');
    } finally {
      setCargando(false);
    }
  };

  const handleAgregarFila = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');

      const datosProcesados = procesarDatosParaEnvio(nuevaFila);
      
      debugOperacion('AGREGAR', datosProcesados);

      console.log('➕ Enviando nuevo registro:', {
        tabla: tablaSeleccionada,
        datos: datosProcesados
      });

      const response = await fetch(`http://localhost:5000/api/admin/tablas/${tablaSeleccionada}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosProcesados)
      });

      const result = await response.json();

      console.log('🔄 Respuesta del servidor (agregar):', result);

      if (result.success) {
        setDatosTabla([result.data, ...datosTabla]);
        setNuevaFila({});
        setMostrarFormularioAgregar(false);
        setMensaje('Registro agregado correctamente');
        
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setError(result.error || 'Error al agregar el registro');
      }
    } catch (error) {
      console.error('Error en agregar fila:', error);
      setError('Error de conexión al servidor');
    } finally {
      setCargando(false);
    }
  };

  const handleInputChange = (campo, valor) => {
    setNuevaFila(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Función para determinar si una columna debe ser excluida del formulario
  const esColumnaExcluida = (columna) => {
    const columnasExcluidas = ['id', 'id_vivienda', 'e_lambda', 'utotal', 'fecha_registro', 'fecha_creacion', 'fecha', 'nombre_usuario', 'nombre_region', 'nombre_comuna'];
    return columnasExcluidas.includes(columna);
  };

  // Función para determinar el tipo de input según la columna - CORREGIDA
  const obtenerTipoInput = (columna) => {
    // Campos específicos para vivienda
    if (tablaSeleccionada === 'vivienda') {
      if (columna === 'region') return 'select-region';
      if (columna === 'comuna') return 'select-comuna';
      if (columna === 'superficie_1' || columna === 'superficie_2') return 'number';
      if (columna === 'cantidad_personas') return 'number';
      if (columna === 'id_usuario') return 'number';
    }
    
    // Campos numéricos
    if (columna.includes('valor') || columna.includes('precio') || columna.includes('porcentaje') || 
        columna.includes('promedio') || columna.includes('ahorro') || columna.includes('potencia') ||
        columna.includes('eficiencia') || columna.includes('poder') || columna.includes('e_m') ||
        columna.includes('rho_kgm3') || columna.includes('lambda_wmk') || columna.includes('r_solucion') ||
        columna.includes('uvidrio') || columna.includes('umarco') || columna.includes('utotal') ||
        columna.includes('precio_m2') || columna.includes('valor_ventana_solucion') ||
        columna.includes('superficie') || columna.includes('cantidad') || columna.includes('personas')) {
      return 'number';
    }
    
    // Campos de ID y cantidades
    if (columna.includes('cantidad') || columna === 'id_usuario' || columna === 'id_region' || 
        columna === 'comuna' || columna === 'id_material' || columna.includes('id_') ||
        columna === 'id_aislante_muro' || columna === 'id_aislante_techo' || 
        columna === 'id_precio_unitario' || columna === 'id_ventana' || 
        columna === 'id_ventana_solucion' || columna === 'id_combustible' ||
        columna === 'id_solucion_muro1' || columna === 'id_solucion_muro2' ||
        columna === 'id_solucion_techo' || columna === 'id_solucion_ventana') {
      return 'number';
    }
    
    // Campos de fecha
    if (columna.includes('fecha') || columna === 'fecha_registro' || columna === 'fecha_creacion') return 'date';
    
    // Campos booleanos
    if (columna.includes('tiene_') || columna === 'activo' || columna === 'habilitado') return 'checkbox';
    
    // Campos de texto largo
    if (columna.includes('descripcion') || columna.includes('comentario') || columna.includes('feedback')) return 'textarea';
    
    return 'text';
  };

  // Función para obtener el valor de display de un campo
  const obtenerValorDisplay = (valor, columna) => {
    if (valor === null || valor === undefined) return '';
    if (obtenerTipoInput(columna) === 'date' && valor) {
      try {
        return new Date(valor).toLocaleDateString('es-CL');
      } catch (e) {
        return String(valor);
      }
    }
    if (obtenerTipoInput(columna) === 'checkbox') {
      return valor ? 'Sí' : 'No';
    }
    return String(valor);
  };

  // Función para renderizar el input correcto según el tipo y tabla
  const renderInput = (columna, valor, enEdicion = false) => {
    const tipo = obtenerTipoInput(columna);
    const className = enEdicion ? "input-edicion" : "";

    if (tipo === 'select-region' && tablaSeleccionada === 'vivienda') {
      return (
        <select
          value={valor || ''}
          onChange={(e) => handleInputChange(columna, e.target.value)}
          className={className}
        >
          <option value="">Seleccionar región</option>
          {opcionesRegion.map(region => (
            <option key={region.id} value={region.nombre}>
              {region.nombre}
            </option>
          ))}
        </select>
      );
    }

    if (tipo === 'select-comuna' && tablaSeleccionada === 'vivienda') {
      return (
        <select
          value={valor || ''}
          onChange={(e) => handleInputChange(columna, e.target.value === '' ? '' : parseInt(e.target.value))}
          className={className}
        >
          <option value="">Seleccionar comuna</option>
          {opcionesComuna.map(comuna => (
            <option key={comuna.id} value={comuna.id}>
              {comuna.nombre}
            </option>
          ))}
        </select>
      );
    }

    if (tipo === 'textarea') {
      return (
        <textarea
          value={valor || ''}
          onChange={(e) => handleInputChange(columna, e.target.value)}
          className={className}
          rows="2"
        />
      );
    }

    if (tipo === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={!!valor}
          onChange={(e) => handleInputChange(columna, e.target.checked)}
          className={className}
        />
      );
    }

    return (
      <input
        type={tipo}
        value={valor || ''}
        onChange={(e) => handleInputChange(columna, e.target.value)}
        className={className}
        step={tipo === 'number' ? '0.01' : undefined}
      />
    );
  };

  return (
    <Layout>
      <div className="form-container">
        <div className="form-header">
          <div className="header-with-actions">
            <div>
              <h1 className="form-title">Administrar Tablas</h1>
              <p className="form-subtitle">
                Gestiona los datos de las tablas del sistema
              </p>
            </div>
            <div className="header-buttons">
              {tablaSeleccionada && datosTabla.length > 0 && (
                <button
                  className="btn-descargar-excel"
                  onClick={descargarTablaExcel}
                  disabled={descargandoExcel || datosTabla.length === 0}
                  title="Descargar tabla actual en Excel"
                >
                  {descargandoExcel ? '⏳' : '📊'} Descargar Excel Actual
                </button>
              )}
              <button
                className="btn-descargar-todas"
                onClick={descargarTodasTablasExcel}
                disabled={descargandoExcel}
                title="Descargar todas las tablas en Excel"
              >
                {descargandoExcel ? '⏳' : '💾'} Descargar Todo en Excel
              </button>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div className="mensaje-exito">
            {mensaje}
            <button onClick={() => setMensaje('')} className="cerrar-mensaje">×</button>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')} className="cerrar-mensaje">×</button>
          </div>
        )}

        {/* Selección de tabla */}
        <div className="seleccion-tabla">
          <h3>Seleccionar Tabla</h3>
          <div className="tablas-grid">
            {tablas.map(tabla => (
              <div
                key={tabla.nombre}
                className={`tabla-card ${tablaSeleccionada === tabla.nombre ? 'seleccionada' : ''}`}
                onClick={() => handleSeleccionarTabla(tabla.nombre)}
              >
                <div className="tabla-nombre">{tabla.nombre}</div>
                <div className="tabla-descripcion">{tabla.descripcion}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gestión de datos */}
        {tablaSeleccionada && (
          <div className="gestion-datos">
            <div className="datos-header">
              <h3>
                Datos de la tabla: {tablaSeleccionada}
                <span className="contador-registros"> ({datosTabla.length} registros)</span>
              </h3>
              
              <div className="acciones-tabla">
                <button
                  className="btn-agregar"
                  onClick={() => setMostrarFormularioAgregar(true)}
                  disabled={cargando}
                >
                  + Agregar Registro
                </button>
                
                <button
                  className="btn-recargar"
                  onClick={() => cargarDatosTabla(tablaSeleccionada)}
                  disabled={cargando}
                >
                  ↻ Recargar
                </button>
              </div>
            </div>

            {/* Formulario para agregar nuevo registro */}
            {mostrarFormularioAgregar && (
              <div className="formulario-agregar">
                <h4>Agregar Nuevo Registro</h4>
                <div className="campos-formulario">
                  {columnas.filter(col => !esColumnaExcluida(col)).map(columna => (
                    <div key={columna} className="campo-input">
                      <label>{columna}</label>
                      {renderInput(columna, nuevaFila[columna] || '')}
                    </div>
                  ))}
                </div>
                <div className="acciones-formulario">
                  <button
                    className="btn-guardar"
                    onClick={handleAgregarFila}
                    disabled={cargando}
                  >
                    {cargando ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    className="btn-cancelar"
                    onClick={() => setMostrarFormularioAgregar(false)}
                    disabled={cargando}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Tabla de datos */}
            {cargando ? (
              <div className="cargando">Cargando datos...</div>
            ) : datosTabla.length === 0 ? (
              <div className="sin-datos">
                No hay registros en esta tabla
              </div>
            ) : (
              <div className="tabla-datos-container">
                <table className="tabla-datos">
                  <thead>
                    <tr>
                      {columnas.map(columna => (
                        <th key={columna}>{columna}</th>
                      ))}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosTabla.map((fila, index) => (
                      <tr key={obtenerIdFila(fila) || index}>
                        {columnas.map(columna => (
                          <td key={columna}>
                            {filaEditando && obtenerIdFila(filaEditando) === obtenerIdFila(fila) ? (
                              renderInput(columna, nuevaFila[columna] || '', true)
                            ) : (
                              obtenerValorDisplay(fila[columna], columna)
                            )}
                          </td>
                        ))}
                        <td className="acciones-celda">
                          {filaEditando && obtenerIdFila(filaEditando) === obtenerIdFila(fila) ? (
                            <>
                              <button
                                className="btn-guardar-chico"
                                onClick={handleGuardarEdicion}
                                disabled={cargando}
                                title="Guardar cambios"
                              >
                                ✅
                              </button>
                              <button
                                className="btn-cancelar-chico"
                                onClick={handleCancelarEdicion}
                                disabled={cargando}
                                title="Cancelar edición"
                              >
                                ❌
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-editar"
                                onClick={() => handleEditarFila(fila)}
                                disabled={cargando}
                                title="Editar registro"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-eliminar"
                                onClick={() => handleEliminarFila(fila)}
                                disabled={cargando}
                                title="Eliminar registro"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Indicador de scroll */}
                <div className="scroll-indicator">Desplázate horizontalmente</div>
              </div>
            )}
          </div>
        )}

        {/* Información para desarrollo */}
        <div className="info-desarrollo">
          <div className="form-nota">
            <p className="nota-titulo">
              <span className="nota-icono">✅</span> Sistema de Gestión de Tablas
            </p>
            <ul className="nota-lista">
              <li>El sistema permite gestionar completamente las siguientes tablas:</li>
              {tablasSistema.map(tabla => (
                <li key={tabla.nombre}>
                  <strong>{tabla.nombre}</strong>: {tabla.descripcion}
                </li>
              ))}
              <li>Funcionalidades disponibles: Agregar, Editar, Eliminar registros en todas las tablas.</li>
              <li><strong>Nueva funcionalidad:</strong> Descarga de tablas en formato Excel (.xlsx)</li>
              {cargando && (
                <li className="cargando-item">
                  ⏳ Procesando operación...
                </li>
              )}
              {descargandoExcel && (
                <li className="cargando-item">
                  ⏳ Generando archivo Excel...
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AdministrarTablas;