// views/Administrador/dashboardMetricas.js
import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import Layout from '../../components/Layout_Admin';
import '../styles.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function DashboardAdmin() {
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    region: 'todas'
  });
  const [metricas, setMetricas] = useState({
    total_usuarios: 0,
    total_evaluaciones: 0,
    total_comentarios: 0,
    valoracion_promedio: 0,
    usuarios_activos: 0,
    tasa_activacion: 0
  });
  const [datosGraficos, setDatosGraficos] = useState({});
  const [regiones, setRegiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtrosActivos, setFiltrosActivos] = useState([]);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // Refs para los gráficos
  const chartRefs = {
    adopcion: useRef(null),
    evaluaciones: useRef(null),
    ubicacion: useRef(null),
    valoraciones: useRef(null),
    ahorro: useRef(null),
    retencion: useRef(null),
    medidas: useRef(null),
    eficiencia: useRef(null)
  };

  // Ref para el contenedor principal del PDF
  const pdfContainerRef = useRef(null);

  // Instancias de los gráficos
  const chartInstances = useRef({});

  // Cargar regiones y métricas iniciales
  useEffect(() => {
    cargarRegiones();
    cargarMetricasReales();
    
    return () => {
      destruirTodosLosGraficos();
    };
  }, []);

  // Cargar métricas automáticamente cuando cambien los filtros
  useEffect(() => {
    if (regiones.length > 0) {
      cargarMetricasReales();
    }
  }, [filters, regiones]);

  const cargarRegiones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/ubicacion/regiones', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setRegiones(result.data || []);
      } else {
        console.error('Error cargando regiones:', response.status);
      }
    } catch (error) {
      console.error('Error cargando regiones:', error);
    }
  };

  const destruirTodosLosGraficos = () => {
    Object.values(chartInstances.current).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    chartInstances.current = {};
  };

  const cargarMetricasReales = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No hay token disponible');
        setCargando(false);
        return;
      }

      // Actualizar filtros activos
      const nuevosFiltros = [];
      if (filters.region !== 'todas') nuevosFiltros.push(`Región: ${filters.region}`);
      if (filters.fechaInicio) nuevosFiltros.push(`Desde: ${new Date(filters.fechaInicio).toLocaleDateString('es-CL')}`);
      if (filters.fechaFin) nuevosFiltros.push(`Hasta: ${new Date(filters.fechaFin).toLocaleDateString('es-CL')}`);
      
      setFiltrosActivos(nuevosFiltros);

      // Construir URL con filtros
      let url = 'http://localhost:5000/api/admin/estadisticas/dashboard-completo-mejorado';
      const params = new URLSearchParams();
      
      if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
      if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
      if (filters.region !== 'todas') params.append('region', filters.region);
      
      if (params.toString()) {
        url = `http://localhost:5000/api/admin/estadisticas/filtradas?${params}`;
      }

      console.log('🔄 Solicitando datos del dashboard con filtros:', { filters, url });
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ Datos del dashboard cargados correctamente con filtros');
        
        // Establecer métricas principales
        setMetricas(result.data.metricasPrincipales || {
          total_usuarios: 0,
          total_evaluaciones: 0,
          total_comentarios: 0,
          valoracion_promedio: 0,
          usuarios_activos: 0,
          tasa_activacion: 0
        });
        
        // Establecer datos para gráficos
        setDatosGraficos(result.data);
        
        // Pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => {
          inicializarGraficos(result.data);
        }, 100);
        
      } else {
        console.error('❌ Error en respuesta del servidor:', result.error);
      }
    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
      setMetricas({
        total_usuarios: 0,
        total_evaluaciones: 0,
        total_comentarios: 0,
        valoracion_promedio: 0,
        usuarios_activos: 0,
        tasa_activacion: 0
      });
    } finally {
      setCargando(false);
    }
  };

  const inicializarGraficos = async (datos) => {
    if (!datos) {
      console.error('❌ No hay datos para inicializar gráficos');
      return;
    }

    // Destruir gráficos existentes
    destruirTodosLosGraficos();

    console.log('🎨 Inicializando gráficos con datos reales de la BD');

    // Configuración común para todos los gráficos
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 14,
              family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
            },
            color: '#333'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 14 },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8
        }
      }
    };

    try {
      // 1. Gráfico de Adopción (Usuarios por Mes)
      if (chartRefs.adopcion.current && datos.adopcion) {
        console.log('📈 Datos adopción:', datos.adopcion);
        
        chartInstances.current.adopcion = new Chart(chartRefs.adopcion.current, {
          type: 'line',
          data: {
            labels: datos.adopcion.meses || [],
            datasets: [
              {
                label: 'Nuevos Usuarios',
                data: datos.adopcion.mau || [],
                borderColor: '#03A64A',
                backgroundColor: 'rgba(3, 166, 74, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#03A64A',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
              }
            ]
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: { 
                display: true, 
                text: 'Nuevos Usuarios por Mes',
                font: { size: 16, weight: 'bold' },
                color: '#03A64A'
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { font: { size: 12 } }
              },
              y: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { font: { size: 12 } },
                beginAtZero: true
              }
            }
          }
        });
        console.log('✅ Gráfico de adopción inicializado');
      }

      // 2. Gráfico de Evaluaciones por Tipo
      if (chartRefs.evaluaciones.current && datos.metricasPrincipales) {
        chartInstances.current.evaluaciones = new Chart(chartRefs.evaluaciones.current, {
          type: 'bar',
          data: {
            labels: ['Calefacción', 'Agua'],
            datasets: [{
              label: 'Cantidad de Evaluaciones',
              data: [
                datos.metricasPrincipales.evaluaciones_calefaccion || 0,
                datos.metricasPrincipales.evaluaciones_agua || 0
              ],
              backgroundColor: ['#03A64A', '#F2921D'],
              borderColor: ['#028a3a', '#e67e22'],
              borderWidth: 2,
              borderRadius: 8,
              barPercentage: 0.6
            }]
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: { 
                display: true, 
                text: 'Evaluaciones por Tipo',
                font: { size: 16, weight: 'bold' },
                color: '#03A64A'
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { font: { size: 12 } }
              },
              y: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { font: { size: 12 } },
                beginAtZero: true
              }
            }
          }
        });
        console.log('✅ Gráfico de evaluaciones inicializado');
      }

      // 3. Gráfico de Ubicación (Usuarios por Región)
      if (chartRefs.ubicacion.current && datos.usuariosRegion) {
        console.log('🌎 Datos ubicación:', datos.usuariosRegion);
        
        chartInstances.current.ubicacion = new Chart(chartRefs.ubicacion.current, {
          type: 'pie',
          data: {
            labels: datos.usuariosRegion.map(item => item.region),
            datasets: [{
              label: 'Usuarios por región',
              data: datos.usuariosRegion.map(item => item.cantidad),
              backgroundColor: [
                '#03A64A', '#F2921D', '#3498db', '#9b59b6',
                '#2ecc71', '#e74c3c', '#f1c40f', '#1abc9c'
              ],
              borderColor: '#ffffff',
              borderWidth: 2,
              hoverOffset: 15
            }]
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: { 
                display: true, 
                text: 'Distribución de Usuarios por Región',
                font: { size: 16, weight: 'bold' },
                color: '#03A64A'
              }
            }
          }
        });
        console.log('✅ Gráfico de ubicación inicializado');
      }

      // 4. Gráfico de Valoraciones (Distribución)
      if (chartRefs.valoraciones.current && datos.distribucionValoraciones) {
        console.log('⭐ Datos valoraciones:', datos.distribucionValoraciones);
        
        chartInstances.current.valoraciones = new Chart(chartRefs.valoraciones.current, {
          type: 'doughnut',
          data: {
            labels: ['⭐ 1 Estrella', '⭐⭐ 2 Estrellas', '⭐⭐⭐ 3 Estrellas', '⭐⭐⭐⭐ 4 Estrellas', '⭐⭐⭐⭐⭐ 5 Estrellas'],
            datasets: [{
              label: 'Valoraciones',
              data: datos.distribucionValoraciones,
              backgroundColor: [
                '#ff6b6b', '#ffa726', '#ffee58', '#9ccc65', '#03A64A'
              ],
              borderColor: '#ffffff',
              borderWidth: 2,
              hoverOffset: 15
            }]
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: { 
                display: true, 
                text: 'Distribución de Valoraciones',
                font: { size: 16, weight: 'bold' },
                color: '#03A64A'
              }
            },
            cutout: '60%'
          }
        });
        console.log('✅ Gráfico de valoraciones inicializado');
      }

      // 5. Gráfico de Ahorro Promedio
      if (chartRefs.ahorro.current && datos.ahorroPromedio) {
        console.log('💰 Datos ahorro:', datos.ahorroPromedio);
        
        chartInstances.current.ahorro = new Chart(chartRefs.ahorro.current, {
          type: 'bar',
          data: {
            labels: datos.ahorroPromedio.map(item => item.tipo),
            datasets: [{
              label: 'Ahorro Promedio ($)',
              data: datos.ahorroPromedio.map(item => item.ahorro || 0),
              backgroundColor: '#03A64A',
              borderColor: '#028a3a',
              borderWidth: 2,
              borderRadius: 8,
              barPercentage: 0.7
            }]
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: { 
                display: true, 
                text: 'Ahorro Promedio por Tipo de Evaluación',
                font: { size: 16, weight: 'bold' },
                color: '#03A64A'
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { font: { size: 12 } }
              },
              y: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { 
                  font: { size: 12 },
                  callback: function(value) {
                    return '$' + value.toLocaleString('es-CL');
                  }
                },
                beginAtZero: true
              }
            }
          }
        });
        console.log('✅ Gráfico de ahorro inicializado');
      }

      // 6. Gráfico de Medidas Recomendadas
      if (chartRefs.medidas.current && datos.medidasRecomendadas) {
        console.log('🔧 Datos medidas:', datos.medidasRecomendadas);
        
        chartInstances.current.medidas = new Chart(chartRefs.medidas.current, {
          type: 'bar',
          data: {
            labels: datos.medidasRecomendadas.map(item => item.medida),
            datasets: [{
              label: 'Veces Recomendada',
              data: datos.medidasRecomendadas.map(item => item.cantidad),
              backgroundColor: '#F2921D',
              borderColor: '#e67e22',
              borderWidth: 2,
              borderRadius: 8,
              barPercentage: 0.7
            }]
          },
          options: {
            ...commonOptions,
            indexAxis: 'y',
            plugins: {
              ...commonOptions.plugins,
              title: { 
                display: true, 
                text: 'Medidas Más Recomendadas',
                font: { size: 16, weight: 'bold' },
                color: '#03A64A'
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { font: { size: 12 } },
                beginAtZero: true
              },
              y: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { font: { size: 12 } }
              }
            }
          }
        });
        console.log('✅ Gráfico de medidas inicializado');
      }

      // 7. Gráfico de Eficiencia (Retorno de Inversión)
      if (chartRefs.eficiencia.current && datos.eficiencia && datos.eficiencia.retorno_inversion) {
        console.log('⚡ Datos eficiencia:', datos.eficiencia.retorno_inversion);
        
        chartInstances.current.eficiencia = new Chart(chartRefs.eficiencia.current, {
          type: 'bar',
          data: {
            labels: datos.eficiencia.retorno_inversion.map(item => item.tipo_medida),
            datasets: [{
              label: 'Retorno de Inversión (años)',
              data: datos.eficiencia.retorno_inversion.map(item => item.retorno_promedio || 0),
              backgroundColor: '#9b59b6',
              borderColor: '#8e44ad',
              borderWidth: 2,
              borderRadius: 8,
              barPercentage: 0.6
            }]
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: { 
                display: true, 
                text: 'Retorno de Inversión por Tipo de Medida',
                font: { size: 16, weight: 'bold' },
                color: '#03A64A'
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { font: { size: 12 } }
              },
              y: {
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { 
                  font: { size: 12 },
                  callback: function(value) {
                    return value + ' años';
                  }
                },
                beginAtZero: true
              }
            }
          }
        });
        console.log('✅ Gráfico de eficiencia inicializado');
      }

      // 8. Gráfico de Retención (Tasa de Activación)
      if (chartRefs.retencion.current && datos.metricasPrincipales) {
        const usuariosActivos = datos.metricasPrincipales.usuarios_activos || 0;
        const totalUsuarios = datos.metricasPrincipales.total_usuarios || 0;
        const usuariosInactivos = Math.max(0, totalUsuarios - usuariosActivos);
        
        console.log('📊 Datos retención:', { usuariosActivos, usuariosInactivos, totalUsuarios });
        
        chartInstances.current.retencion = new Chart(chartRefs.retencion.current, {
          type: 'doughnut',
          data: {
            labels: ['Usuarios Activos', 'Usuarios Inactivos'],
            datasets: [{
              label: 'Tasa de Activación',
              data: [usuariosActivos, usuariosInactivos],
              backgroundColor: ['#03A64A', '#e74c3c'],
              borderColor: '#ffffff',
              borderWidth: 2,
              hoverOffset: 15
            }]
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: { 
                display: true, 
                text: 'Tasa de Activación de Usuarios',
                font: { size: 16, weight: 'bold' },
                color: '#03A64A'
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                    return `${context.label}: ${context.raw} (${percentage}%)`;
                  }
                }
              }
            },
            cutout: '60%'
          }
        });
        console.log('✅ Gráfico de retención inicializado');
      }

      console.log('🎉 Todos los gráficos inicializados correctamente');

    } catch (error) {
      console.error('❌ Error inicializando gráficos:', error);
    }
  };

  // FUNCIÓN PARA DESCARGAR TODO EN PDF
  const descargarDashboardPDF = async () => {
    if (generandoPDF) return;
    
    setGenerandoPDF(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);

      let currentY = margin;

      // Función auxiliar para agregar texto
      const agregarTexto = (texto, y, estilos = {}) => {
        const { fontSize = 10, fontStyle = 'normal', align = 'left', x = margin } = estilos;
        
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        
        const lineHeight = fontSize * 0.3528 * 1.2;
        const lines = pdf.splitTextToSize(texto, contentWidth);
        
        if (y + (lines.length * lineHeight) > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        
        lines.forEach((line, index) => {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, x, y + (index * lineHeight), { align });
        });
        
        return y + (lines.length * lineHeight);
      };

      // 1. HEADER
      currentY = agregarTexto('DASHBOARD ADMINISTRATIVO', currentY, { 
        fontSize: 20, 
        fontStyle: 'bold', 
        align: 'center'
      });
      
      currentY = agregarTexto('Resumen completo de métricas y estadísticas', currentY, { 
        fontSize: 12, 
        fontStyle: 'italic', 
        align: 'center'
      });
      
      currentY += 5;
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      // 2. INFORMACIÓN DE FILTROS
      if (filtrosActivos.length > 0) {
        currentY = agregarTexto('Filtros aplicados:', currentY, { 
          fontSize: 12, 
          fontStyle: 'bold' 
        });
        
        filtrosActivos.forEach(filtro => {
          currentY = agregarTexto(`• ${filtro}`, currentY, { fontSize: 10 });
        });
        currentY += 10;
      }

      // 3. MÉTRICAS PRINCIPALES
      currentY = agregarTexto('MÉTRICAS PRINCIPALES', currentY, { 
        fontSize: 16, 
        fontStyle: 'bold' 
      });
      
      const metricasTexto = [
        `Total Usuarios: ${metricas.total_usuarios}`,
        `Total Evaluaciones: ${metricas.total_evaluaciones}`,
        `Total Comentarios: ${metricas.total_comentarios}`,
        `Valoración Promedio: ${metricas.valoracion_promedio ? metricas.valoracion_promedio.toFixed(1) : '0.0'}`,
        `Usuarios Activos: ${metricas.usuarios_activos}`,
        `Tasa de Activación: ${metricas.tasa_activacion}%`
      ];
      
      metricasTexto.forEach(metrica => {
        currentY = agregarTexto(metrica, currentY, { fontSize: 11 });
      });
      
      currentY += 15;

      // 4. CAPTURAR GRÁFICOS UNO POR UNO
      const graficos = [
        { nombre: 'adopcion', titulo: 'NUEVOS USUARIOS POR MES', ref: chartRefs.adopcion },
        { nombre: 'retencion', titulo: 'TASA DE ACTIVACIÓN DE USUARIOS', ref: chartRefs.retencion },
        { nombre: 'ubicacion', titulo: 'DISTRIBUCIÓN DE USUARIOS POR REGIÓN', ref: chartRefs.ubicacion },
        { nombre: 'evaluaciones', titulo: 'EVALUACIONES POR TIPO', ref: chartRefs.evaluaciones },
        { nombre: 'valoraciones', titulo: 'DISTRIBUCIÓN DE VALORACIONES', ref: chartRefs.valoraciones },
        { nombre: 'medidas', titulo: 'MEDIDAS MÁS RECOMENDADAS', ref: chartRefs.medidas },
        { nombre: 'ahorro', titulo: 'AHORRO PROMEDIO POR TIPO DE EVALUACIÓN', ref: chartRefs.ahorro },
        { nombre: 'eficiencia', titulo: 'RETORNO DE INVERSIÓN POR TIPO DE MEDIDA', ref: chartRefs.eficiencia }
      ];

      for (const grafico of graficos) {
        if (!grafico.ref.current || !chartInstances.current[grafico.nombre]) {
          continue;
        }

        // Verificar espacio en página
        if (currentY > pageHeight - 100) {
          pdf.addPage();
          currentY = margin;
        }

        // Agregar título del gráfico
        currentY = agregarTexto(grafico.titulo, currentY, { 
          fontSize: 14, 
          fontStyle: 'bold' 
        });
        currentY += 5;

        try {
          // Capturar el canvas del gráfico
          const canvas = grafico.ref.current;
          const imgData = canvas.toDataURL('image/png', 1.0);
          
          // Calcular dimensiones manteniendo proporción
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Verificar si la imagen cabe en la página actual
          if (currentY + imgHeight > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
          }

          // Agregar imagen al PDF
          pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 10;

        } catch (error) {
          console.error(`Error capturando gráfico ${grafico.nombre}:`, error);
          currentY = agregarTexto(`Error al cargar el gráfico: ${grafico.titulo}`, currentY, { fontSize: 10 });
          currentY += 5;
        }
      }

      // 5. FOOTER
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-CL')} | Dashboard Administrativo`, 
        pageWidth / 2, pageHeight - 10, { align: 'center' });

      const nombreArchivo = `dashboard_admin_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(nombreArchivo);

    } catch (error) {
      console.error('Error generando PDF del dashboard:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Los filtros se aplicarán automáticamente por el useEffect
  };

  const limpiarFiltros = () => {
    setFilters({
      fechaInicio: '',
      fechaFin: '',
      region: 'todas'
    });
    // Los filtros se aplicarán automáticamente por el useEffect
  };

  return (
    <Layout>
      <main className="form-container">
        <div ref={pdfContainerRef}>
          <div className="form-header">
            <div className="header-with-actions">
              <div>
                <h1 className="form-title">Dashboard de Métricas</h1>
                <p className="form-subtitle">
                  Resumen completo del uso y impacto de la aplicación
                </p>
              </div>
              <button 
                className="btn-descargar-todos"
                onClick={descargarDashboardPDF}
                disabled={generandoPDF || cargando}
                title="Descargar dashboard completo en PDF"
              >
                {generandoPDF ? '🔄 Generando PDF...' : '📊 Descargar Dashboard PDF'}
              </button>
            </div>
          </div>

          {/* Filtros Mejorados - SIN BOTÓN APLICAR */}
          <div className="filtros-section">
            <div className="filtros-header">
              <h3>Filtros del Dashboard</h3>
              <button 
                className="btn-limpiar-filtros"
                onClick={limpiarFiltros}
                disabled={cargando}
              >
                🧹 Limpiar Filtros
              </button>
            </div>
            
            <div className="filtros-form">
              <div className="filtros-grid">
                <div className="filtro-group">
                  <label htmlFor="fechaInicio">
                    <span className="label-icon">📅</span>
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    id="fechaInicio"
                    name="fechaInicio"
                    value={filters.fechaInicio}
                    onChange={handleFilterChange}
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
                    value={filters.fechaFin}
                    onChange={handleFilterChange}
                    className="filtro-input"
                  />
                </div>

                <div className="filtro-group">
                  <label htmlFor="region">
                    <span className="label-icon">🌎</span>
                    Región
                  </label>
                  <select
                    id="region"
                    name="region"
                    value={filters.region}
                    onChange={handleFilterChange}
                    className="filtro-select"
                  >
                    <option value="todas">Todas las regiones</option>
                    {regiones.map(region => (
                      <option key={region.id} value={region.nombre}>
                        {region.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Información de filtros aplicados */}
            {filtrosActivos.length > 0 && (
              <div className="filtros-activos">
                <strong>Filtros activos:</strong>
                {filtrosActivos.map((filtro, index) => (
                  <span key={index} className="filtro-activo">
                    {filtro}
                  </span>
                ))}
                {cargando && <span className="cargando-filtro">🔄 Aplicando...</span>}
              </div>
            )}
          </div>

          {cargando ? (
            <div className="cargando">
              <div className="cargando-icono">📊</div>
              Cargando métricas del dashboard...
            </div>
          ) : (
            <>
              {/* Tarjetas de Resumen Principal */}
              <div className="metricas-resumen-fila">
                <div className="metrica-card principal">
                  <div className="metrica-icono">👥</div>
                  <div className="metrica-contenido">
                    <div className="metrica-valor">{metricas.total_usuarios}</div>
                    <div className="metrica-label">Total Usuarios</div>
                  </div>
                </div>
                
                <div className="metrica-card principal">
                  <div className="metrica-icono">📈</div>
                  <div className="metrica-contenido">
                    <div className="metrica-valor">{metricas.total_evaluaciones}</div>
                    <div className="metrica-label">Evaluaciones Realizadas</div>
                  </div>
                </div>
                
                <div className="metrica-card principal">
                  <div className="metrica-icono">💬</div>
                  <div className="metrica-contenido">
                    <div className="metrica-valor">{metricas.total_comentarios}</div>
                    <div className="metrica-label">Comentarios</div>
                  </div>
                </div>
                
                <div className="metrica-card principal">
                  <div className="metrica-icono">⭐</div>
                  <div className="metrica-contenido">
                    <div className="metrica-valor">
                      {metricas.valoracion_promedio ? metricas.valoracion_promedio.toFixed(1) : '0.0'}
                    </div>
                    <div className="metrica-label">Valoración Promedio</div>
                  </div>
                </div>

                <div className="metrica-card principal">
                  <div className="metrica-icono">🚀</div>
                  <div className="metrica-contenido">
                    <div className="metrica-valor">{metricas.usuarios_activos}</div>
                    <div className="metrica-label">Usuarios Activos</div>
                  </div>
                </div>

                <div className="metrica-card principal">
                  <div className="metrica-icono">📊</div>
                  <div className="metrica-contenido">
                    <div className="metrica-valor">{metricas.tasa_activacion}%</div>
                    <div className="metrica-label">Tasa de Activación</div>
                  </div>
                </div>
              </div>

              {/* Sección: Métricas de Adopción */}
              <div className="seccion-dashboard">
                <div className="seccion-header">
                  <h2 className="seccion-titulo">📊 Métricas de Adopción</h2>
                </div>
                <div className="graficos-grid-mejorado">
                  <div className="grafico-container-xl">
                    <div className="grafico-header">
                      <h3>Nuevos Usuarios por Mes</h3>
                    </div>
                    <div className="chart-wrapper-xl">
                      <canvas ref={chartRefs.adopcion}></canvas>
                    </div>
                  </div>
                  
                  <div className="grafico-container-lg">
                    <div className="grafico-header">
                      <h3>Tasa de Activación de Usuarios</h3>
                    </div>
                    <div className="chart-wrapper-lg">
                      <canvas ref={chartRefs.retencion}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Datos Geográficos */}
              <div className="seccion-dashboard">
                <div className="seccion-header">
                  <h2 className="seccion-titulo">🌎 Datos Geográficos</h2>
                </div>
                <div className="graficos-grid-mejorado">
                  <div className="grafico-container-lg">
                    <div className="grafico-header">
                      <h3>Distribución de Usuarios por Región</h3>
                    </div>
                    <div className="chart-wrapper-lg">
                      <canvas ref={chartRefs.ubicacion}></canvas>
                    </div>
                  </div>
                  
                  <div className="grafico-container-lg">
                    <div className="grafico-header">
                      <h3>Evaluaciones por Tipo</h3>
                    </div>
                    <div className="chart-wrapper-lg">
                      <canvas ref={chartRefs.evaluaciones}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Interacción de Usuarios */}
              <div className="seccion-dashboard">
                <div className="seccion-header">
                  <h2 className="seccion-titulo">💬 Interacción de Usuarios</h2>
                </div>
                <div className="graficos-grid-mejorado">
                  <div className="grafico-container-lg">
                    <div className="grafico-header">
                      <h3>Distribución de Valoraciones</h3>
                    </div>
                    <div className="chart-wrapper-lg">
                      <canvas ref={chartRefs.valoraciones}></canvas>
                    </div>
                  </div>
                  
                  <div className="grafico-container-lg">
                    <div className="grafico-header">
                      <h3>Medidas Más Recomendadas</h3>
                    </div>
                    <div className="chart-wrapper-lg">
                      <canvas ref={chartRefs.medidas}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Impacto Técnico */}
              <div className="seccion-dashboard">
                <div className="seccion-header">
                  <h2 className="seccion-titulo">💡 Impacto Técnico</h2>
                </div>
                <div className="graficos-grid-mejorado">
                  <div className="grafico-container-xl">
                    <div className="grafico-header">
                      <h3>Ahorro Promedio por Tipo de Evaluación</h3>
                    </div>
                    <div className="chart-wrapper-xl">
                      <canvas ref={chartRefs.ahorro}></canvas>
                    </div>
                  </div>
                  
                  <div className="grafico-container-lg">
                    <div className="grafico-header">
                      <h3>Retorno de Inversión por Tipo de Medida</h3>
                    </div>
                    <div className="chart-wrapper-lg">
                      <canvas ref={chartRefs.eficiencia}></canvas>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}

export default DashboardAdmin;