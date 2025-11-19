import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import '../styles.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function Evaluaciones() {
  const [user, setUser] = useState({});
  const [evaluacionesCalefaccion, setEvaluacionesCalefaccion] = useState([]);
  const [evaluacionesAgua, setEvaluacionesAgua] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('todas');
  const [generandoPDF, setGenerandoPDF] = useState(false);
  
  const pdfRef = useRef();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    cargarEvaluaciones();
  }, []);

  const cargarEvaluaciones = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No estás autenticado');
        return;
      }

      const responseCalefaccion = await fetch('http://localhost:5000/api/evaluaciones/mis-evaluaciones', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (responseCalefaccion.ok) {
        const resultCalefaccion = await responseCalefaccion.json();
        if (resultCalefaccion.success) {
          setEvaluacionesCalefaccion(resultCalefaccion.data || []);
        }
      }

      const responseAgua = await fetch('http://localhost:5000/api/evaluacion-agua/mis-evaluaciones', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (responseAgua.ok) {
        const resultAgua = await responseAgua.json();
        if (resultAgua.success) {
          setEvaluacionesAgua(resultAgua.data || []);
        }
      }

    } catch (error) {
      console.error('Error cargando evaluaciones:', error);
      setError('Error al cargar las evaluaciones');
    } finally {
      setCargando(false);
    }
  };

  // Función para formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    return new Date(fecha).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Función para formatear moneda
  const formatearMoneda = (valor) => {
    const num = parseFloat(valor) || 0;
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(num);
  };

  // Función segura para convertir a número
  const aNumero = (valor, defaultValue = 0) => {
    if (valor === null || valor === undefined) return defaultValue;
    const num = parseFloat(valor);
    return isNaN(num) ? defaultValue : num;
  };

  // Función para obtener el texto completo de la medida aplicada
  const obtenerTextoMedida = (evaluacion, tipo) => {
    let nombreArtefacto = '';
    let descripcionMedida = '';

    switch(tipo) {
      case 'ducha':
        nombreArtefacto = evaluacion.medida_ducha_nombre || '';
        descripcionMedida = evaluacion.medida_ducha_descripcion || '';
        break;
      case 'lavamanos':
        nombreArtefacto = evaluacion.medida_lavamanos_nombre || '';
        descripcionMedida = evaluacion.medida_lavamanos_descripcion || '';
        break;
      case 'lavaplatos':
        nombreArtefacto = evaluacion.medida_lavaplatos_nombre || '';
        descripcionMedida = evaluacion.medida_lavaplatos_descripcion || '';
        break;
      case 'wc':
        nombreArtefacto = evaluacion.medida_wc_nombre || '';
        descripcionMedida = evaluacion.medida_wc_descripcion || '';
        break;
      default:
        return null;
    }

    if (!nombreArtefacto) return null;

    if (descripcionMedida && descripcionMedida !== nombreArtefacto) {
      return descripcionMedida;
    } else {
      return nombreArtefacto;
    }
  };

  // Función para verificar si una medida está aplicada
  const tieneMedidaAplicada = (evaluacion, tipo) => {
    switch(tipo) {
      case 'ducha':
        return evaluacion.medida_ducha_nombre != null;
      case 'lavamanos':
        return evaluacion.medida_lavamanos_nombre != null;
      case 'lavaplatos':
        return evaluacion.medida_lavaplatos_nombre != null;
      case 'wc':
        return evaluacion.medida_wc_nombre != null;
      default:
        return false;
    }
  };

  // Calcular estadísticas para gráficos
  const calcularEstadisticas = () => {
    const stats = {
      calefaccion: {
        total: evaluacionesCalefaccion.length,
        ahorroPromedio: evaluacionesCalefaccion.reduce((acc, evaluacion) => acc + aNumero(evaluacion.ahorroanual), 0) / (evaluacionesCalefaccion.length || 1),
        inversionPromedio: evaluacionesCalefaccion.reduce((acc, evaluacion) => acc + aNumero(evaluacion.inversion), 0) / (evaluacionesCalefaccion.length || 1),
        eficienciaPromedio: evaluacionesCalefaccion.reduce((acc, evaluacion) => acc + aNumero(evaluacion.eficiencia), 0) / (evaluacionesCalefaccion.length || 1),
        paybackPromedio: evaluacionesCalefaccion.reduce((acc, evaluacion) => acc + aNumero(evaluacion.payback), 0) / (evaluacionesCalefaccion.length || 1)
      },
      agua: {
        total: evaluacionesAgua.length,
        ahorroPromedio: evaluacionesAgua.reduce((acc, evaluacion) => acc + aNumero(evaluacion.ahorro_dinero), 0) / (evaluacionesAgua.length || 1),
        inversionPromedio: evaluacionesAgua.reduce((acc, evaluacion) => acc + aNumero(evaluacion.inversion), 0) / (evaluacionesAgua.length || 1),
        ahorroAguaPromedio: evaluacionesAgua.reduce((acc, evaluacion) => acc + aNumero(evaluacion.ahorro_m3_mes), 0) / (evaluacionesAgua.length || 1),
        retornoPromedio: evaluacionesAgua.reduce((acc, evaluacion) => acc + aNumero(evaluacion.retorno), 0) / (evaluacionesAgua.length || 1)
      }
    };
    return stats;
  };

  const stats = calcularEstadisticas();

  // Función para renderizar gráfico de barras mejorada
  const GraficoBarras = ({ datos, titulo, color = '#F2921D' }) => {
    const valoresValidos = datos.filter(d => d.valor !== null && d.valor !== undefined);
    const maxValor = valoresValidos.length > 0 ? Math.max(...valoresValidos.map(d => d.valor), 1) : 1;
    
    return (
      <div className="grafico-barras">
        <h4>{titulo}</h4>
        <div className="barras-container">
          {datos.map((dato, index) => {
            const porcentaje = ((dato.valor || 0) / maxValor) * 100;
            
            return (
              <div key={index} className="barra-item">
                <div className="barra-label">{dato.etiqueta}</div>
                <div className="barra-content">
                  <div className="barra-valor-externo">
                    {dato.valorFormateado}
                  </div>
                  <div className="barra-wrapper">
                    <div 
                      className={`barra ${porcentaje > 50 ? 'larga' : ''}`}
                      style={{ 
                        width: `${porcentaje}%`,
                        backgroundColor: color
                      }}
                    >
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Datos para gráficos comparativos
  const getDatosComparativosCalefaccion = () => {
    return evaluacionesCalefaccion.slice(0, 5).map((evaluacion, index) => ({
      etiqueta: `Eval ${index + 1}`,
      eficiencia: aNumero(evaluacion.eficiencia),
      ahorroAnual: aNumero(evaluacion.ahorroanual),
      inversion: aNumero(evaluacion.inversion),
      payback: aNumero(evaluacion.payback),
      fecha: evaluacion.fecha_creacion
    }));
  };

  const getDatosComparativosAgua = () => {
    return evaluacionesAgua.slice(0, 5).map((evaluacion, index) => ({
      etiqueta: `Eval ${index + 1}`,
      ahorroDinero: aNumero(evaluacion.ahorro_dinero),
      ahorroAgua: aNumero(evaluacion.ahorro_m3_mes),
      inversion: aNumero(evaluacion.inversion),
      retorno: aNumero(evaluacion.retorno),
      fecha: evaluacion.fecha_creacion
    }));
  };

  // FUNCIÓN COMPLETAMENTE REVISADA PARA DESCARGAR PDF
  // FUNCIÓN COMPLETA Y CORREGIDA PARA DESCARGAR PDF CON TODOS LOS GRÁFICOS
// FUNCIÓN COMPLETAMENTE CORREGIDA PARA DESCARGAR PDF
  const descargarPDFCompleto = async () => {
    if (generandoPDF) return;
    
    setGenerandoPDF(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Configurar fuente
      pdf.setFont('helvetica');
      pdf.setFontSize(10);

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);

      let currentY = margin;

      // Función auxiliar mejorada para texto
      const agregarTexto = (texto, y, estilos = {}) => {
        const { 
          fontSize = 10, 
          fontStyle = 'normal', 
          align = 'left', 
          x = margin,
          color = '#000000',
          lineHeightMultiplier = 1.2
        } = estilos;
        
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        pdf.setTextColor(color);
        
        const lineHeight = fontSize * 0.3528 * lineHeightMultiplier;
        const lines = pdf.splitTextToSize(texto, contentWidth);
        
        // Manejo de páginas
        if (y + (lines.length * lineHeight) > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        
        lines.forEach((line, index) => {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          
          let xPos = x;
          if (align === 'center') {
            xPos = pageWidth / 2;
          } else if (align === 'right') {
            xPos = pageWidth - margin;
          }
          
          pdf.text(line, xPos, y + (index * lineHeight), { align });
        });
        
        return y + (lines.length * lineHeight);
      };

      // Función para agregar espacio
      const agregarEspacio = (y, espacio = 5) => {
        return y + espacio;
      };

      // 1. HEADER
      currentY = agregarTexto('Mis Evaluaciones', currentY, { 
        fontSize: 22, 
        fontStyle: 'bold', 
        align: 'center',
        color: '#2c3e50'
      });
      
      currentY = agregarTexto('Historial completo de todas tus evaluaciones realizadas', currentY, { 
        fontSize: 12, 
        fontStyle: 'normal', 
        align: 'center',
        color: '#7f8c8d'
      });
      
      currentY = agregarEspacio(currentY, 8);
      
      // Línea separadora
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY = agregarEspacio(currentY, 15);

      // 2. INFORMACIÓN DEL USUARIO
      currentY = agregarTexto('INFORMACIÓN DE TU CUENTA', currentY, { 
        fontSize: 16, 
        fontStyle: 'bold',
        color: '#2c3e50'
      });
      
      currentY = agregarTexto(`Nombre: ${user.nombre_completo || 'No disponible'}`, currentY, { fontSize: 11 });
      currentY = agregarTexto(`Email: ${user.correo || 'No disponible'}`, currentY, { fontSize: 11 });
      currentY = agregarTexto(`Total evaluaciones: ${evaluacionesCalefaccion.length + evaluacionesAgua.length}`, currentY, { 
        fontSize: 11,
        fontStyle: 'bold'
      });
      currentY = agregarEspacio(currentY, 12);

      // 3. RESUMEN ESTADÍSTICO
      currentY = agregarTexto('RESUMEN ESTADÍSTICO', currentY, { 
        fontSize: 16, 
        fontStyle: 'bold',
        color: '#2c3e50'
      });
      
      // Calefacción
      currentY = agregarTexto('CALEFACCIÓN', currentY, { 
        fontSize: 14, 
        fontStyle: 'bold',
        color: '#e74c3c'
      });
      
      currentY = agregarTexto(stats.calefaccion.total.toString(), currentY, { 
        fontSize: 18, 
        fontStyle: 'bold', 
        align: 'center' 
      });
      
      currentY = agregarTexto('EVALUACIONES', currentY, { 
        align: 'center',
        fontSize: 10
      });
      
      currentY = agregarTexto(`• Ahorro promedio: ${formatearMoneda(stats.calefaccion.ahorroPromedio)}/año`, currentY, { fontSize: 9 });
      currentY = agregarTexto(`• Inversión promedio: ${formatearMoneda(stats.calefaccion.inversionPromedio)}`, currentY, { fontSize: 9 });
      currentY = agregarTexto(`• Eficiencia promedio: ${stats.calefaccion.eficienciaPromedio.toFixed(1)} kWh/m² año`, currentY, { fontSize: 9 });
      currentY = agregarEspacio(currentY, 10);

      // Agua
      currentY = agregarTexto('AGUA', currentY, { 
        fontSize: 14, 
        fontStyle: 'bold',
        color: '#3498db'
      });
      
      currentY = agregarTexto(stats.agua.total.toString(), currentY, { 
        fontSize: 18, 
        fontStyle: 'bold', 
        align: 'center' 
      });
      
      currentY = agregarTexto('EVALUACIONES', currentY, { 
        align: 'center',
        fontSize: 10
      });
      
      currentY = agregarTexto(`• Ahorro promedio: ${formatearMoneda(stats.agua.ahorroPromedio)}/mes`, currentY, { fontSize: 9 });
      currentY = agregarTexto(`• Inversión promedio: ${formatearMoneda(stats.agua.inversionPromedio)}`, currentY, { fontSize: 9 });
      currentY = agregarTexto(`• Ahorro agua: ${stats.agua.ahorroAguaPromedio.toFixed(1)} m³/mes`, currentY, { fontSize: 9 });
      currentY = agregarEspacio(currentY, 15);

      // 4. GRÁFICOS DE CALEFACCIÓN
      if (evaluacionesCalefaccion.length > 0) {
        if (currentY > pageHeight - 100) {
          pdf.addPage();
          currentY = margin;
        }

        currentY = agregarTexto('COMPARATIVO DE EVALUACIONES - CALEFACCIÓN', currentY, { 
          fontSize: 14, 
          fontStyle: 'bold' 
        });
        currentY = agregarEspacio(currentY, 5);

        // Crear gráficos de calefacción
        const graficosCalefaccion = [
          {
            titulo: 'Eficiencia Energética (kWh/m² año)',
            datos: getDatosComparativosCalefaccion().map(d => ({
              etiqueta: d.etiqueta,
              valor: d.eficiencia,
              valorFormateado: d.eficiencia.toFixed(1)
            })),
            color: '#FF6B6B'
          },
          {
            titulo: 'Ahorro Anual ($)',
            datos: getDatosComparativosCalefaccion().map(d => ({
              etiqueta: d.etiqueta,
              valor: d.ahorroAnual,
              valorFormateado: formatearMoneda(d.ahorroAnual)
            })),
            color: '#4ECDC4'
          },
          {
            titulo: 'Inversión Requerida ($)',
            datos: getDatosComparativosCalefaccion().map(d => ({
              etiqueta: d.etiqueta,
              valor: d.inversion,
              valorFormateado: formatearMoneda(d.inversion)
            })),
            color: '#45B7D1'
          },
          {
            titulo: 'Periodo de Retorno (años)',
            datos: getDatosComparativosCalefaccion().map(d => ({
              etiqueta: d.etiqueta,
              valor: d.payback,
              valorFormateado: d.payback.toFixed(1) + ' años'
            })),
            color: '#96CEB4'
          }
        ];

        for (const grafico of graficosCalefaccion) {
          // Verificar espacio en página
          if (currentY > pageHeight - 80) {
            pdf.addPage();
            currentY = margin;
          }

          // Crear elemento temporal para el gráfico
          const elementoGrafico = document.createElement('div');
          elementoGrafico.style.width = '600px';
          elementoGrafico.style.padding = '20px';
          elementoGrafico.style.backgroundColor = 'white';
          elementoGrafico.style.border = '1px solid #ddd';
          elementoGrafico.style.borderRadius = '8px';
          elementoGrafico.style.margin = '10px';
          elementoGrafico.style.fontFamily = 'Arial, sans-serif';

          // Construir el gráfico como HTML
          let contenidoHTML = `
            <div style="font-family: Arial, sans-serif; width: 100%;">
              <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px; text-align: center;">${grafico.titulo}</h4>
              <div style="display: flex; flex-direction: column; gap: 12px;">
          `;

          const maxValor = Math.max(...grafico.datos.map(d => Math.abs(d.valor)), 1);
          
          grafico.datos.forEach(dato => {
            const porcentaje = ((Math.abs(dato.valor) || 0) / maxValor) * 90;
            contenidoHTML += `
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="min-width: 60px; font-size: 12px; font-weight: bold;">${dato.etiqueta}</div>
                <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                  <div style="min-width: 100px; font-size: 11px; text-align: right;">${dato.valorFormateado}</div>
                  <div style="flex: 1; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                    <div style="height: 100%; width: ${porcentaje}%; background: ${grafico.color}; border-radius: 10px;"></div>
                  </div>
                </div>
              </div>
            `;
          });

          contenidoHTML += `
              </div>
            </div>
          `;

          elementoGrafico.innerHTML = contenidoHTML;
          document.body.appendChild(elementoGrafico);

          try {
            const canvas = await html2canvas(elementoGrafico, {
              scale: 2,
              useCORS: true,
              allowTaint: false,
              backgroundColor: '#ffffff',
              logging: false,
              width: elementoGrafico.offsetWidth,
              height: elementoGrafico.scrollHeight
            });

            document.body.removeChild(elementoGrafico);

            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Asegurar que la imagen quepa en la página
            if (currentY + imgHeight > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
            }

            pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
            
          } catch (error) {
            console.error('Error capturando gráfico:', error);
            document.body.removeChild(elementoGrafico);
            // Si falla, mostrar los datos en texto
            currentY = agregarTexto(grafico.titulo, currentY, { fontSize: 12, fontStyle: 'bold' });
            grafico.datos.forEach(dato => {
              currentY = agregarTexto(`${dato.etiqueta}: ${dato.valorFormateado}`, currentY, { fontSize: 9 });
            });
            currentY = agregarEspacio(currentY, 5);
          }
        }
      }

      // 5. GRÁFICOS DE AGUA
      if (evaluacionesAgua.length > 0) {
        if (currentY > pageHeight - 100) {
          pdf.addPage();
          currentY = margin;
        }

        currentY = agregarTexto('COMPARATIVO DE EVALUACIONES - AGUA', currentY, { 
          fontSize: 14, 
          fontStyle: 'bold' 
        });
        currentY = agregarEspacio(currentY, 5);

        // Crear gráficos de agua
        const graficosAgua = [
          {
            titulo: 'Ahorro de Dinero ($/mes)',
            datos: getDatosComparativosAgua().map(d => ({
              etiqueta: d.etiqueta,
              valor: d.ahorroDinero,
              valorFormateado: formatearMoneda(d.ahorroDinero)
            })),
            color: '#4ECDC4'
          },
          {
            titulo: 'Ahorro de Agua (m³/mes)',
            datos: getDatosComparativosAgua().map(d => ({
              etiqueta: d.etiqueta,
              valor: d.ahorroAgua,
              valorFormateado: d.ahorroAgua.toFixed(1) + ' m³'
            })),
            color: '#45B7D1'
          },
          {
            titulo: 'Inversión Requerida ($)',
            datos: getDatosComparativosAgua().map(d => ({
              etiqueta: d.etiqueta,
              valor: d.inversion,
              valorFormateado: formatearMoneda(d.inversion)
            })),
            color: '#FF6B6B'
          },
          {
            titulo: 'Periodo de Retorno (meses)',
            datos: getDatosComparativosAgua().map(d => ({
              etiqueta: d.etiqueta,
              valor: d.retorno,
              valorFormateado: d.retorno + ' meses'
            })),
            color: '#96CEB4'
          }
        ];

        for (const grafico of graficosAgua) {
          // Verificar espacio en página
          if (currentY > pageHeight - 80) {
            pdf.addPage();
            currentY = margin;
          }

          // Crear elemento temporal para el gráfico
          const elementoGrafico = document.createElement('div');
          elementoGrafico.style.width = '600px';
          elementoGrafico.style.padding = '20px';
          elementoGrafico.style.backgroundColor = 'white';
          elementoGrafico.style.border = '1px solid #ddd';
          elementoGrafico.style.borderRadius = '8px';
          elementoGrafico.style.margin = '10px';
          elementoGrafico.style.fontFamily = 'Arial, sans-serif';

          // Construir el gráfico como HTML
          let contenidoHTML = `
            <div style="font-family: Arial, sans-serif; width: 100%;">
              <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px; text-align: center;">${grafico.titulo}</h4>
              <div style="display: flex; flex-direction: column; gap: 12px;">
          `;

          const maxValor = Math.max(...grafico.datos.map(d => Math.abs(d.valor)), 1);
          
          grafico.datos.forEach(dato => {
            const porcentaje = ((Math.abs(dato.valor) || 0) / maxValor) * 90;
            contenidoHTML += `
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="min-width: 60px; font-size: 12px; font-weight: bold;">${dato.etiqueta}</div>
                <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                  <div style="min-width: 100px; font-size: 11px; text-align: right;">${dato.valorFormateado}</div>
                  <div style="flex: 1; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                    <div style="height: 100%; width: ${porcentaje}%; background: ${grafico.color}; border-radius: 10px;"></div>
                  </div>
                </div>
              </div>
            `;
          });

          contenidoHTML += `
              </div>
            </div>
          `;

          elementoGrafico.innerHTML = contenidoHTML;
          document.body.appendChild(elementoGrafico);

          try {
            const canvas = await html2canvas(elementoGrafico, {
              scale: 2,
              useCORS: true,
              allowTaint: false,
              backgroundColor: '#ffffff',
              logging: false,
              width: elementoGrafico.offsetWidth,
              height: elementoGrafico.scrollHeight
            });

            document.body.removeChild(elementoGrafico);

            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Asegurar que la imagen quepa en la página
            if (currentY + imgHeight > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
            }

            pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
            
          } catch (error) {
            console.error('Error capturando gráfico:', error);
            document.body.removeChild(elementoGrafico);
            // Si falla, mostrar los datos en texto
            currentY = agregarTexto(grafico.titulo, currentY, { fontSize: 12, fontStyle: 'bold' });
            grafico.datos.forEach(dato => {
              currentY = agregarTexto(`${dato.etiqueta}: ${dato.valorFormateado}`, currentY, { fontSize: 9 });
            });
            currentY = agregarEspacio(currentY, 5);
          }
        }
      }

      // 6. EVALUACIONES DETALLADAS - CALEFACCIÓN
      if (evaluacionesCalefaccion.length > 0) {
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = margin;
        }

        currentY = agregarTexto('EVALUACIONES DE CALEFACCIÓN - DETALLE', currentY, { 
          fontSize: 14, 
          fontStyle: 'bold' 
        });
        currentY = agregarEspacio(currentY, 10);

        evaluacionesCalefaccion.forEach((evaluacion, index) => {
          // Verificar si necesitamos nueva página para esta evaluación
          if (currentY > pageHeight - 100) {
            pdf.addPage();
            currentY = margin;
          }
          
          currentY = agregarTexto(`Evaluación #${index + 1}`, currentY, { 
            fontSize: 12, 
            fontStyle: 'bold' 
          });
          
          currentY = agregarTexto(formatearFecha(evaluacion.fecha_creacion), currentY, { fontSize: 9 });
          currentY = agregarEspacio(currentY, 5);
          
          // Información básica
          currentY = agregarTexto(`Combustible: ${evaluacion.combustible_nombre || 'No especificado'}`, currentY, { fontSize: 9 });
          currentY = agregarTexto(`Consumo anual: ${formatearMoneda(evaluacion.consumoanual)}`, currentY, { fontSize: 9 });
          currentY = agregarTexto(`Superficie: ${aNumero(evaluacion.superficie_1) + aNumero(evaluacion.superficie_2)} m²`, currentY, { fontSize: 9 });
          currentY = agregarEspacio(currentY, 5);
          
          // Métricas
          const metrics = [
            `EFICIENCIA: ${aNumero(evaluacion.eficiencia).toFixed(1)} kWh/m² año`,
            `INVERSIÓN: ${formatearMoneda(evaluacion.inversion)}`,
            `AHORRO ANUAL: ${formatearMoneda(evaluacion.ahorroanual)}`,
            `RETORNO: ${aNumero(evaluacion.payback).toFixed(1)} años`
          ];
          
          metrics.forEach(metric => {
            if (currentY > pageHeight - 10) {
              pdf.addPage();
              currentY = margin;
            }
            currentY = agregarTexto(metric, currentY, { fontSize: 9 });
          });
          
          currentY = agregarEspacio(currentY, 5);
          
          // Soluciones aplicadas
          currentY = agregarTexto('Soluciones aplicadas:', currentY, { fontSize: 9, fontStyle: 'bold' });
          
          const soluciones = [
            evaluacion.solucion_muro1_nombre ? `• Muro 1: ${evaluacion.solucion_muro1_nombre}` : null,
            evaluacion.solucion_muro2_nombre ? `• Muro 2: ${evaluacion.solucion_muro2_nombre}` : null,
            evaluacion.solucion_techo_nombre ? `• Techo: ${evaluacion.solucion_techo_nombre}` : null,
            evaluacion.solucion_ventana_nombre ? `• Ventana: ${evaluacion.solucion_ventana_nombre}` : null
          ].filter(Boolean);
          
          soluciones.forEach(solucion => {
            if (currentY > pageHeight - 10) {
              pdf.addPage();
              currentY = margin;
            }
            currentY = agregarTexto(solucion, currentY, { fontSize: 9, x: margin + 5 });
          });
          
          currentY = agregarEspacio(currentY, 10);
        });
      }

      // 7. EVALUACIONES DETALLADAS - AGUA
      if (evaluacionesAgua.length > 0) {
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = margin;
        }

        currentY = agregarTexto('EVALUACIONES DE AGUA - DETALLE', currentY, { 
          fontSize: 14, 
          fontStyle: 'bold' 
        });
        currentY = agregarEspacio(currentY, 10);

        evaluacionesAgua.forEach((evaluacion, index) => {
          // Verificar si necesitamos nueva página para esta evaluación
          if (currentY > pageHeight - 100) {
            pdf.addPage();
            currentY = margin;
          }
          
          currentY = agregarTexto(`Evaluación #${index + 1}`, currentY, { 
            fontSize: 12, 
            fontStyle: 'bold' 
          });
          
          currentY = agregarTexto(formatearFecha(evaluacion.fecha_creacion), currentY, { fontSize: 9 });
          currentY = agregarEspacio(currentY, 5);
          
          // Información básica
          currentY = agregarTexto(`Precio agua: ${formatearMoneda(evaluacion.precio_agua)}/m³`, currentY, { fontSize: 9 });
          currentY = agregarTexto(`Consumo actual: ${aNumero(evaluacion.consumo_agua_potable)} m³/mes`, currentY, { fontSize: 9 });
          currentY = agregarTexto(`Artefactos: ${aNumero(evaluacion.cantidad_duchas)} duchas, ${aNumero(evaluacion.cantidad_lavamanos)} lavamanos, ${aNumero(evaluacion.cantidad_wc)} WC, ${aNumero(evaluacion.cantidad_lavaplatos)} lavaplatos`, currentY, { fontSize: 9 });
          currentY = agregarEspacio(currentY, 5);
          
          // Métricas
          const metrics = [
            `AHORRO $: ${formatearMoneda(evaluacion.ahorro_dinero)}/mes`,
            `AHORRO AGUA: ${aNumero(evaluacion.ahorro_m3_mes)} m³/mes`,
            `INVERSIÓN: ${formatearMoneda(evaluacion.inversion)}`,
            `RETORNO: ${aNumero(evaluacion.retorno)} meses`
          ];
          
          metrics.forEach(metric => {
            if (currentY > pageHeight - 10) {
              pdf.addPage();
              currentY = margin;
            }
            currentY = agregarTexto(metric, currentY, { fontSize: 9 });
          });
          
          currentY = agregarEspacio(currentY, 5);
          
          // Medidas aplicadas
          currentY = agregarTexto('Medidas de ahorro aplicadas:', currentY, { fontSize: 9, fontStyle: 'bold' });
          
          const medidas = [
            tieneMedidaAplicada(evaluacion, 'ducha') ? `• Ducha: ${obtenerTextoMedida(evaluacion, 'ducha')}` : null,
            tieneMedidaAplicada(evaluacion, 'lavamanos') ? `• Lavamanos: ${obtenerTextoMedida(evaluacion, 'lavamanos')}` : null,
            tieneMedidaAplicada(evaluacion, 'lavaplatos') ? `• Lavaplatos: ${obtenerTextoMedida(evaluacion, 'lavaplatos')}` : null,
            tieneMedidaAplicada(evaluacion, 'wc') ? `• WC: ${obtenerTextoMedida(evaluacion, 'wc')}` : null
          ].filter(Boolean);
          
          medidas.forEach(medida => {
            if (currentY > pageHeight - 10) {
              pdf.addPage();
              currentY = margin;
            }
            currentY = agregarTexto(medida, currentY, { fontSize: 9, x: margin + 5 });
          });
          
          // Equivalente
          currentY = agregarEspacio(currentY, 3);
          currentY = agregarTexto(`Equivalente: ${aNumero(evaluacion.equivalente_tinas)} tinas/mes`, currentY, { fontSize: 9, fontStyle: 'bold' });
          
          currentY = agregarEspacio(currentY, 10);
        });
      }

      // 8. FOOTER
      const fechaGeneracion = new Date().toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado el ${fechaGeneracion} | Sistema de Evaluaciones Energéticas`, 
        pageWidth / 2, pageHeight - 10, { align: 'center' });

      const nombreArchivo = `evaluaciones_${user.nombre_completo || 'usuario'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(nombreArchivo);

    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setGenerandoPDF(false);
    }
  };

  return (
    <Layout>
      <div className="form-container pdf-optimizado" ref={pdfRef}>
        <div className="form-header">
          <h1 className="form-title">Mis Evaluaciones</h1>
          <p className="form-subtitle">
            Historial completo de todas tus evaluaciones realizadas
          </p>
          
          {/* BOTÓN DE DESCARGA PDF */}
          <div className="header-actions">
            <button 
              onClick={descargarPDFCompleto}
              className="btn-descargar-informe"
              disabled={generandoPDF || (evaluacionesCalefaccion.length === 0 && evaluacionesAgua.length === 0)}
            >
              <span className="btn-icon">
                {generandoPDF ? '⏳' : '📊'}
              </span>
              {generandoPDF ? 'Generando PDF...' : 'Descargar PDF Completo'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={cargarEvaluaciones} className="btn-reintentar">
              Reintentar
            </button>
          </div>
        )}

        {/* Información del usuario */}
        <div className="usuario-info-card">
          <h3 className="usuario-info-title">
            <span className="usuario-icon">👤</span> Información de tu cuenta
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <strong className="info-label">Nombre:</strong>
              <span className="info-value">{user.nombre_completo || 'No disponible'}</span>
            </div>
            <div className="info-item">
              <strong className="info-label">Email:</strong>
              <span className="info-value">{user.correo || 'No disponible'}</span>
            </div>
            <div className="info-item">
              <strong className="info-label">Total evaluaciones:</strong>
              <span className="info-value destacado">
                {evaluacionesCalefaccion.length + evaluacionesAgua.length}
              </span>
            </div>
          </div>
        </div>

        {/* Filtros - Se ocultarán en PDF */}
        <div className="filtros-section">
          <h3>Filtrar por tipo:</h3>
          <div className="filtros-botones">
            <button 
              className={`filtro-btn ${tipoSeleccionado === 'todas' ? 'activo' : ''}`}
              onClick={() => setTipoSeleccionado('todas')}
            >
              Todas ({evaluacionesCalefaccion.length + evaluacionesAgua.length})
            </button>
            <button 
              className={`filtro-btn ${tipoSeleccionado === 'calefaccion' ? 'activo' : ''}`}
              onClick={() => setTipoSeleccionado('calefaccion')}
            >
              Calefacción ({evaluacionesCalefaccion.length})
            </button>
            <button 
              className={`filtro-btn ${tipoSeleccionado === 'agua' ? 'activo' : ''}`}
              onClick={() => setTipoSeleccionado('agua')}
            >
              Agua ({evaluacionesAgua.length})
            </button>
          </div>
        </div>

        {/* Resumen Estadístico */}
        <div className="resumen-estadistico">
          <h2>📊 Resumen Estadístico</h2>
          <div className="stats-grid">
            <div className="stat-card calefaccion">
              <h3>Calefacción</h3>
              <div className="stat-number">{stats.calefaccion.total}</div>
              <div className="stat-label">Evaluaciones</div>
              <div className="stat-details">
                <p>Ahorro promedio: {formatearMoneda(stats.calefaccion.ahorroPromedio)}/año</p>
                <p>Inversión promedio: {formatearMoneda(stats.calefaccion.inversionPromedio)}</p>
                <p>Eficiencia promedio: {stats.calefaccion.eficienciaPromedio.toFixed(1)} kWh/m² año</p>
              </div>
            </div>
            
            <div className="stat-card agua">
              <h3>Agua</h3>
              <div className="stat-number">{stats.agua.total}</div>
              <div className="stat-label">Evaluaciones</div>
              <div className="stat-details">
                <p>Ahorro promedio: {formatearMoneda(stats.agua.ahorroPromedio)}/mes</p>
                <p>Inversión promedio: {formatearMoneda(stats.agua.inversionPromedio)}</p>
                <p>Ahorro agua: {stats.agua.ahorroAguaPromedio.toFixed(1)} m³/mes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos Comparativos - Calefacción */}
        {(tipoSeleccionado === 'todas' || tipoSeleccionado === 'calefaccion') && evaluacionesCalefaccion.length > 0 && (
          <div className="graficos-section">
            <h2>🔥 Comparativo de Evaluaciones - Calefacción</h2>
            <div className="graficos-grid">
              <GraficoBarras
                titulo="Eficiencia Energética (kWh/m² año)"
                datos={getDatosComparativosCalefaccion().map(d => ({
                  etiqueta: d.etiqueta,
                  valor: d.eficiencia,
                  valorFormateado: d.eficiencia.toFixed(1)
                }))}
                color="#FF6B6B"
              />
              
              <GraficoBarras
                titulo="Ahorro Anual ($)"
                datos={getDatosComparativosCalefaccion().map(d => ({
                  etiqueta: d.etiqueta,
                  valor: d.ahorroAnual,
                  valorFormateado: formatearMoneda(d.ahorroAnual)
                }))}
                color="#4ECDC4"
              />
              
              <GraficoBarras
                titulo="Inversión Requerida ($)"
                datos={getDatosComparativosCalefaccion().map(d => ({
                  etiqueta: d.etiqueta,
                  valor: d.inversion,
                  valorFormateado: formatearMoneda(d.inversion)
                }))}
                color="#45B7D1"
              />
              
              <GraficoBarras
                titulo="Periodo de Retorno (años)"
                datos={getDatosComparativosCalefaccion().map(d => ({
                  etiqueta: d.etiqueta,
                  valor: d.payback,
                  valorFormateado: d.payback.toFixed(1) + ' años'
                }))}
                color="#96CEB4"
              />
            </div>
          </div>
        )}

        {/* Gráficos Comparativos - AGUA */}
        {(tipoSeleccionado === 'todas' || tipoSeleccionado === 'agua') && evaluacionesAgua.length > 0 && (
          <div className="graficos-section">
            <h2>💧 Comparativo de Evaluaciones - Agua</h2>
            <div className="graficos-grid">
              <GraficoBarras
                titulo="Ahorro de Dinero ($/mes)"
                datos={getDatosComparativosAgua().map(d => ({
                  etiqueta: d.etiqueta,
                  valor: d.ahorroDinero,
                  valorFormateado: formatearMoneda(d.ahorroDinero)
                }))}
                color="#4ECDC4"
              />
              
              <GraficoBarras
                titulo="Ahorro de Agua (m³/mes)"
                datos={getDatosComparativosAgua().map(d => ({
                  etiqueta: d.etiqueta,
                  valor: d.ahorroAgua,
                  valorFormateado: d.ahorroAgua.toFixed(1) + ' m³'
                }))}
                color="#45B7D1"
              />
              
              <GraficoBarras
                titulo="Inversión Requerida ($)"
                datos={getDatosComparativosAgua().map(d => ({
                  etiqueta: d.etiqueta,
                  valor: d.inversion,
                  valorFormateado: formatearMoneda(d.inversion)
                }))}
                color="#FF6B6B"
              />
              
              <GraficoBarras
                titulo="Periodo de Retorno (meses)"
                datos={getDatosComparativosAgua().map(d => ({
                  etiqueta: d.etiqueta,
                  valor: d.retorno,
                  valorFormateado: d.retorno + ' meses'
                }))}
                color="#96CEB4"
              />
            </div>
          </div>
        )}

        {/* Lista de Evaluaciones - Calefacción */}
        {(tipoSeleccionado === 'todas' || tipoSeleccionado === 'calefaccion') && (
          <div className="evaluaciones-section">
            <h2>🔥 Evaluaciones de Calefacción</h2>
            {evaluacionesCalefaccion.length === 0 ? (
              <div className="sin-evaluaciones">
                <p>No has realizado evaluaciones de calefacción aún.</p>
              </div>
            ) : (
              <div className="evaluaciones-grid">
                {evaluacionesCalefaccion.map((evaluacion, index) => (
                <div key={evaluacion.id} className="evaluacion-card">
                  <div className="evaluacion-header">
                    <h4>Evaluación #{index + 1}</h4>
                    <span className="fecha">{formatearFecha(evaluacion.fecha_creacion)}</span>
                  </div>
                    
                    <div className="evaluacion-details">
                      <div className="detail-row">
                        <span>Combustible:</span>
                        <strong>{evaluacion.combustible_nombre || 'No especificado'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Consumo anual:</span>
                        <strong>{formatearMoneda(evaluacion.consumoanual)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Superficie:</span>
                        <strong>{aNumero(evaluacion.superficie_1) + aNumero(evaluacion.superficie_2)} m²</strong>
                      </div>
                    </div>

                    <div className="resultados-grid">
                      <div className="resultado-item eficiencia">
                        <div className="resultado-label">Eficiencia</div>
                        <div className="resultado-valor">{aNumero(evaluacion.eficiencia).toFixed(1)} kWh/m² año</div>
                      </div>
                      <div className="resultado-item inversion">
                        <div className="resultado-label">Inversión</div>
                        <div className="resultado-valor">{formatearMoneda(evaluacion.inversion)}</div>
                      </div>
                      <div className="resultado-item ahorro">
                        <div className="resultado-label">Ahorro anual</div>
                        <div className="resultado-valor">{formatearMoneda(evaluacion.ahorroanual)}</div>
                      </div>
                      <div className="resultado-item payback">
                        <div className="resultado-label">Retorno</div>
                        <div className="resultado-valor">{aNumero(evaluacion.payback).toFixed(1)} años</div>
                      </div>
                    </div>

                    <div className="soluciones">
                      <h5>Soluciones aplicadas:</h5>
                      <ul>
                        {evaluacion.solucion_muro1_nombre && (
                          <li>Muro 1: {evaluacion.solucion_muro1_nombre}</li>
                        )}
                        {evaluacion.solucion_muro2_nombre && (
                          <li>Muro 2: {evaluacion.solucion_muro2_nombre}</li>
                        )}
                        {evaluacion.solucion_techo_nombre && (
                          <li>Techo: {evaluacion.solucion_techo_nombre}</li>
                        )}
                        {evaluacion.solucion_ventana_nombre && (
                          <li>Ventana: {evaluacion.solucion_ventana_nombre}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de Evaluaciones - Agua */}
        {(tipoSeleccionado === 'todas' || tipoSeleccionado === 'agua') && (
          <div className="evaluaciones-section">
            <h2>💧 Evaluaciones de Agua</h2>
            {evaluacionesAgua.length === 0 ? (
              <div className="sin-evaluaciones">
                <p>No has realizado evaluaciones de agua aún.</p>
              </div>
            ) : (
              <div className="evaluaciones-grid">
                {evaluacionesAgua.map((evaluacion, index) => (
                <div key={evaluacion.id} className="evaluacion-card">
                  <div className="evaluacion-header">
                    <h4>Evaluación #{index + 1}</h4>
                    <span className="fecha">{formatearFecha(evaluacion.fecha_creacion)}</span>
                  </div>
                    
                    <div className="evaluacion-details">
                      <div className="detail-row">
                        <span>Precio agua:</span>
                        <strong>{formatearMoneda(evaluacion.precio_agua)}/m³</strong>
                      </div>
                      <div className="detail-row">
                        <span>Consumo actual:</span>
                        <strong>{aNumero(evaluacion.consumo_agua_potable)} m³/mes</strong>
                      </div>
                      <div className="detail-row">
                        <span>Artefactos:</span>
                        <strong>
                          {aNumero(evaluacion.cantidad_duchas)} duchas, {aNumero(evaluacion.cantidad_lavamanos)} lavamanos, {aNumero(evaluacion.cantidad_wc)} WC, {aNumero(evaluacion.cantidad_lavaplatos)} lavaplatos
                        </strong>
                      </div>
                    </div>

                    <div className="resultados-grid">
                      <div className="resultado-item ahorro-dinero">
                        <div className="resultado-label">Ahorro $</div>
                        <div className="resultado-valor">{formatearMoneda(evaluacion.ahorro_dinero)}/mes</div>
                      </div>
                      <div className="resultado-item ahorro-agua">
                        <div className="resultado-label">Ahorro agua</div>
                        <div className="resultado-valor">{aNumero(evaluacion.ahorro_m3_mes)} m³/mes</div>
                      </div>
                      <div className="resultado-item inversion">
                        <div className="resultado-label">Inversión</div>
                        <div className="resultado-valor">{formatearMoneda(evaluacion.inversion)}</div>
                      </div>
                      <div className="resultado-item retorno">
                        <div className="resultado-label">Retorno</div>
                        <div className="resultado-valor">{aNumero(evaluacion.retorno)} meses</div>
                      </div>
                    </div>

                    <div className="soluciones">
                      <h5>Medidas de ahorro aplicadas:</h5>
                      <ul>
                        {tieneMedidaAplicada(evaluacion, 'ducha') && (
                          <li>Ducha: {obtenerTextoMedida(evaluacion, 'ducha')}</li>
                        )}
                        {tieneMedidaAplicada(evaluacion, 'lavamanos') && (
                          <li>Lavamanos: {obtenerTextoMedida(evaluacion, 'lavamanos')}</li>
                        )}
                        {tieneMedidaAplicada(evaluacion, 'lavaplatos') && (
                          <li>Lavaplatos: {obtenerTextoMedida(evaluacion, 'lavaplatos')}</li>
                        )}
                        {tieneMedidaAplicada(evaluacion, 'wc') && (
                          <li>WC: {obtenerTextoMedida(evaluacion, 'wc')}</li>
                        )}
                      </ul>
                    </div>

                    <div className="equivalentes">
                      <p><strong>Equivalente:</strong> {aNumero(evaluacion.equivalente_tinas)} tinas/mes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Evaluaciones;