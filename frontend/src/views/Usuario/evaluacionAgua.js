// kipus/src/views/Usuario/evaluacionAgua.js
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import NotificationContainer from '../../components/NotificationContainer';
import { useNotification } from '../../hooks/useNotification';
import '../styles.css';

// Importar imágenes
import duchaImg from '../../assets/ducha.png';
import lavamanosImg from '../../assets/lavamanos.png';
import wcImg from '../../assets/wc.png';
import lavaplatosImg from '../../assets/lavaplatos.png';
import reductorImg from '../../assets/reductor.png';
import duchaEcologicaImg from '../../assets/duchaecologica.png';
import aireadorImg from '../../assets/aireador.png';
import dobleDescargaImg from '../../assets/dobledescarga.png';
import reductorEstanqueImg from '../../assets/reductorestanque.png';

const EvaluacionAgua = () => {
  const [precioAgua, setPrecioAgua] = useState({
    consumoAguaPotable: '',
    servicioAlcantarillado: ''
  });
  
  const [numeroPersonas, setNumeroPersonas] = useState('');
  const [editandoPersonas, setEditandoPersonas] = useState(false);
  const [cargandoPersonas, setCargandoPersonas] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [errores, setErrores] = useState({});
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  // Estado para los artefactos y medidas desde la BD
  const [artefactosData, setArtefactosData] = useState([]);
  const [cargandoArtefactos, setCargandoArtefactos] = useState(true);

  // Estado para las medidas seleccionadas
  const [medidasSeleccionadas, setMedidasSeleccionadas] = useState({});
  
  // Estado para la cantidad de artefactos - ACTUALIZADO
  const [cantidadArtefactos, setCantidadArtefactos] = useState({
    ducha: 1,
    lavamanos: 1,
    wc: 1,
    lavaplatos: 1,
    lavadora: 1
  });

  // Estado para los resultados
  const [resultados, setResultados] = useState({
    ahorroM3Mes: 0,
    ahorroDineroMes: 0,
    inversionTotal: 0,
    retornoMeses: 0,
    equivalenteTinas: 0
  });

  // Estado para el valor de la tina
  const [valorTina, setValorTina] = useState(0.16); // Valor por defecto

  // Usar el hook de notificaciones
  const { notifications, removeNotification, showSuccess, showError, showInfo, showWarning } = useNotification();

  // Calcular suma de precios en tiempo real
  const calcularPrecioTotal = () => {
    const agua = parseFloat(precioAgua.consumoAguaPotable) || 0;
    const alcantarillado = parseFloat(precioAgua.servicioAlcantarillado) || 0;
    return (agua + alcantarillado).toFixed(0);
  };

  // Verificar si hay al menos una medida seleccionada
  const hayMedidasSeleccionadas = () => {
    return Object.keys(medidasSeleccionadas).length > 0;
  };

  // Cargar datos de la vivienda desde la BD
  useEffect(() => {
    const cargarDatosVivienda = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setErrorCarga('No estás autenticado. Por favor, inicia sesión nuevamente.');
          setCargandoDatos(false);
          return;
        }

        console.log('🔍 Cargando datos de vivienda...');
        
        const response = await fetch('http://localhost:5000/api/vivienda/datos', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📊 Respuesta completa de vivienda/datos:', result);

        if (result.success && result.vivienda) {
          const personas = result.vivienda.cantidad_personas;
          console.log('✅ Personas obtenidas de BD:', personas);
          setNumeroPersonas(personas || '');
          setErrorCarga('');
        } else {
          console.error('❌ Error en respuesta del servidor:', result.error);
          setErrorCarga(result.error || 'No se pudieron cargar los datos de la vivienda');
          setNumeroPersonas('');
        }
      } catch (error) {
        console.error('❌ Error cargando datos de vivienda:', error);
        setErrorCarga(`Error de conexión: ${error.message}. Verifica que el servidor esté funcionando.`);
        setNumeroPersonas('');
      } finally {
        setCargandoDatos(false);
      }
    };

    cargarDatosVivienda();
  }, []);

  // Cargar artefactos y medidas desde la base de datos - ACTUALIZADO
  useEffect(() => {
    const cargarArtefactosDesdeBD = async () => {
      try {
        console.log('🔍 Cargando artefactos desde la base de datos...');
        
        // Cargar artefactos básicos
        const artefactosResponse = await fetch('http://localhost:5000/api/artefactos');
        const artefactosResult = await artefactosResponse.json();
        
        if (!artefactosResult.success) {
          throw new Error('Error al cargar artefactos');
        }

        // Cargar medidas de ahorro
        const medidasResponse = await fetch('http://localhost:5000/api/artefactos/medidas');
        const medidasResult = await medidasResponse.json();
        
        if (!medidasResult.success) {
          throw new Error('Error al cargar medidas de ahorro');
        }

        console.log('📊 Artefactos cargados:', artefactosResult.data);
        console.log('📊 Medidas cargadas:', medidasResult.data);

        // Obtener valor de la tina
        const tinaArtefacto = artefactosResult.data.find(artefacto => 
          artefacto.nombre.toLowerCase() === 'tina'
        );
        if (tinaArtefacto) {
          setValorTina(parseFloat(tinaArtefacto.promedio_diario_pp));
          console.log('🛁 Valor de la tina obtenido:', tinaArtefacto.promedio_diario_pp);
        }

        // Mapear datos de la BD a la estructura esperada - SIN FILTRAR
        const artefactosMapeados = artefactosResult.data.map(artefacto => {
          // Asignar imágenes según el nombre del artefacto
          let imagen = '';
          switch(artefacto.nombre.toLowerCase()) {
            case 'ducha':
              imagen = duchaImg;
              break;
            case 'lavamanos':
              imagen = lavamanosImg;
              break;
            case 'wc':
              imagen = wcImg;
              break;
            case 'lavaplatos':
              imagen = lavaplatosImg;
              break;
            case 'lavadora':
              // Puedes agregar una imagen para lavadora si la tienes
              imagen = ''; 
              break;
            case 'tina':
              // Puedes agregar una imagen para tina si la tienes
              imagen = '';
              break;
            default:
              imagen = '';
          }

          // Filtrar medidas para este artefacto
          const medidasArtefacto = medidasResult.data.filter(medida => 
            medida.artefacto.toLowerCase() === artefacto.nombre.toLowerCase()
          ).map(medida => {
            // Asignar imagen según la medida de ahorro
            let imagenMedida = '';
            if (medida.medida_ahorro.toLowerCase().includes('reductor')) {
              imagenMedida = reductorImg;
            } else if (medida.medida_ahorro.toLowerCase().includes('ecológica')) {
              imagenMedida = duchaEcologicaImg;
            } else if (medida.medida_ahorro.toLowerCase().includes('aireador')) {
              imagenMedida = aireadorImg;
            } else if (medida.medida_ahorro.toLowerCase().includes('doble')) {
              imagenMedida = dobleDescargaImg;
            } else if (medida.medida_ahorro.toLowerCase().includes('estanque')) {
              imagenMedida = reductorEstanqueImg;
            }

            return {
              id: medida.id,
              nombre: medida.medida_ahorro,
              ahorroConservador: parseFloat(medida.ahorro_conservador),
              precioUnitario: parseFloat(medida.precio_unitario),
              imagen: imagenMedida
            };
          });

          return {
            id: artefacto.nombre.toLowerCase(),
            nombre: artefacto.nombre,
            promedioDiario: parseFloat(artefacto.promedio_diario_pp),
            imagen: imagen,
            medidas: medidasArtefacto,
            tieneMedidas: medidasArtefacto.length > 0
          };
        });

        console.log('✅ Todos los artefactos mapeados:', artefactosMapeados);
        setArtefactosData(artefactosMapeados);

      } catch (error) {
        console.error('❌ Error cargando artefactos desde BD:', error);
        setArtefactosData([]);
      } finally {
        setCargandoArtefactos(false);
      }
    };

    cargarArtefactosDesdeBD();
  }, []);

  // Manejar cambio en precios
  const handlePrecioChange = (campo, valor) => {
    const nuevoValor = valor === '' ? '' : parseFloat(valor) || 0;
    setPrecioAgua(prev => ({
      ...prev,
      [campo]: nuevoValor
    }));
  };

  // Manejar cambio en número de personas (modo edición)
  const handlePersonasChange = (valor) => {
    // Permitir vacío para poder borrar completamente
    if (valor === '') {
      setNumeroPersonas('');
      return;
    }
    
    const nuevoValor = parseInt(valor);
    if (!isNaN(nuevoValor) && nuevoValor >= 1) {
      setNumeroPersonas(nuevoValor);
    }
  };

  // Guardar nueva cantidad de personas en la BD
  const guardarPersonas = async () => {
    if (!numeroPersonas || numeroPersonas < 1) {
      showError('La cantidad de personas debe ser al menos 1');
      return;
    }

    setCargandoPersonas(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('No estás autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }

      console.log('💾 Guardando cantidad de personas:', numeroPersonas);
      
      const response = await fetch('http://localhost:5000/api/vivienda/actualizar-personas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cantidad_personas: numeroPersonas
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📨 Respuesta de actualización:', result);

      if (result.success) {
        setEditandoPersonas(false);
        showSuccess('Cantidad de personas actualizada exitosamente');
      } else {
        throw new Error(result.error || 'Error desconocido al actualizar');
      }
    } catch (error) {
      console.error('❌ Error guardando cantidad de personas:', error);
      showError(`Error al guardar: ${error.message}`);
      await recargarDatosVivienda();
    } finally {
      setCargandoPersonas(false);
    }
  };

  // Función para recargar datos desde la BD
  const recargarDatosVivienda = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/vivienda/datos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.vivienda) {
          setNumeroPersonas(result.vivienda.cantidad_personas || '');
        }
      }
    } catch (error) {
      console.error('Error recargando datos:', error);
    }
  };

  // Manejar cancelar edición
  const handleCancelarEdicion = async () => {
    await recargarDatosVivienda();
    setEditandoPersonas(false);
    showInfo('Edición cancelada', 'Se restauraron los valores originales');
  };

  // Manejar selección de medida
  const handleMedidaSelect = (artefactoId, medida) => {
    setMedidasSeleccionadas(prev => {
      const medidaActual = prev[artefactoId];
      
      // Si ya está seleccionada esta misma medida, la deseleccionamos
      if (medidaActual && medidaActual.id === medida.id) {
        const nuevasMedidas = { ...prev };
        delete nuevasMedidas[artefactoId];
        return nuevasMedidas;
      }
      
      // Si no, seleccionamos la nueva medida
      return {
        ...prev,
        [artefactoId]: medida
      };
    });
  };

  // Manejar cambio en cantidad de artefactos - ACTUALIZADO
  const handleCantidadArtefactoChange = (artefactoId, valor) => {
    // Permitir vacío temporalmente
    if (valor === '') {
      setCantidadArtefactos(prev => ({
        ...prev,
        [artefactoId]: ''
      }));
      return;
    }
    
    // Convertir a número y validar
    const cantidad = parseInt(valor);
    if (!isNaN(cantidad) && cantidad >= 0) {
      setCantidadArtefactos(prev => ({
        ...prev,
        [artefactoId]: cantidad
      }));
    }
  };

  // Obtener porcentaje de ahorro para display
  const getPorcentajeAhorro = (artefactoId) => {
    const medida = medidasSeleccionadas[artefactoId];
    return medida ? `${medida.ahorroConservador}%` : '0%';
  };

  // Calcular resultados - VERSIÓN CORREGIDA
  useEffect(() => {
    if (artefactosData.length === 0 || !numeroPersonas || numeroPersonas < 1) return;

    console.log('🧮 Iniciando cálculo EXACTO de consumo...');

    // Si no hay medidas seleccionadas, establecer todos los valores en 0
    if (!hayMedidasSeleccionadas()) {
      setResultados({
        ahorroM3Mes: 0,
        ahorroDineroMes: 0,
        inversionTotal: 0,
        retornoMeses: 0,
        equivalenteTinas: 0
      });
      return;
    }

    // Obtener los artefactos específicos para el cálculo
    const artefactosCalculo = artefactosData.filter(artefacto => 
      ['ducha', 'lavamanos', 'wc', 'lavaplatos', 'lavadora'].includes(artefacto.id)
    );

    console.log('📊 Artefactos para cálculo:', artefactosCalculo.map(a => a.nombre));

    // Variables para cada artefacto según tu fórmula exacta
    let consumoActualDucha = 0;
    let consumoActualLavamanos = 0;
    let consumoActualWc = 0;
    let consumoActualLavaplatos = 0;
    let consumoActualLavadora = 0;

    let consumoAhorroDucha = 0;
    let consumoAhorroLavamanos = 0;
    let consumoAhorroWc = 0;
    let consumoAhorroLavaplatos = 0;

    let inversionTotal = 0;

    // Calcular consumo actual para cada artefacto según tu fórmula exacta
    artefactosCalculo.forEach(artefacto => {
      const cantidad = cantidadArtefactos[artefacto.id] || 1;
      
      // Fórmula: ((numeroPersonas * promedio_diario_pp * 30) / 1000)
      const consumoArtefactoM3Mes = ((numeroPersonas * artefacto.promedioDiario * 30) / 1000);
      
      // Asignar a la variable correspondiente
      switch(artefacto.id) {
        case 'ducha':
          consumoActualDucha = consumoArtefactoM3Mes;
          break;
        case 'lavamanos':
          consumoActualLavamanos = consumoArtefactoM3Mes;
          break;
        case 'wc':
          consumoActualWc = consumoArtefactoM3Mes;
          break;
        case 'lavaplatos':
          consumoActualLavaplatos = consumoArtefactoM3Mes;
          break;
        case 'lavadora':
          consumoActualLavadora = consumoArtefactoM3Mes;
          break;
      }

      console.log(`📊 ${artefacto.nombre}: ${consumoArtefactoM3Mes.toFixed(2)} m³/mes`);
    });

    // Calcular consumo con ahorro SOLO para los artefactos que tienen medidas
    artefactosCalculo.forEach(artefacto => {
      const cantidad = cantidadArtefactos[artefacto.id] || 1;
      const medida = medidasSeleccionadas[artefacto.id];

      // Solo aplicar ahorro a Ducha, Lavamanos, WC, Lavaplatos
      if (medida && ['ducha', 'lavamanos', 'wc', 'lavaplatos'].includes(artefacto.id)) {
        const consumoActual = ((numeroPersonas * artefacto.promedioDiario * 30) / 1000);
        const consumoConAhorro = consumoActual * (1 - (medida.ahorroConservador / 100));
        
        switch(artefacto.id) {
          case 'ducha':
            consumoAhorroDucha = consumoConAhorro;
            // Calcular inversión para ducha
            inversionTotal += cantidad * medida.precioUnitario;
            break;
          case 'lavamanos':
            consumoAhorroLavamanos = consumoConAhorro;
            // Calcular inversión para lavamanos
            inversionTotal += cantidad * medida.precioUnitario;
            break;
          case 'wc':
            consumoAhorroWc = consumoConAhorro;
            // Calcular inversión para wc
            inversionTotal += cantidad * medida.precioUnitario;
            break;
          case 'lavaplatos':
            consumoAhorroLavaplatos = consumoConAhorro;
            // Calcular inversión para lavaplatos
            inversionTotal += cantidad * medida.precioUnitario;
            break;
        }
        
        console.log(`💰 ${artefacto.nombre} con ahorro: ${consumoConAhorro.toFixed(2)} m³/mes (Ahorro: ${medida.ahorroConservador}%)`);
      } else if (['ducha', 'lavamanos', 'wc', 'lavaplatos'].includes(artefacto.id)) {
        // Si no hay medida seleccionada, el consumo con ahorro es igual al consumo actual
        const consumoActual = ((numeroPersonas * artefacto.promedioDiario * 30) / 1000);
        switch(artefacto.id) {
          case 'ducha':
            consumoAhorroDucha = consumoActual;
            break;
          case 'lavamanos':
            consumoAhorroLavamanos = consumoActual;
            break;
          case 'wc':
            consumoAhorroWc = consumoActual;
            break;
          case 'lavaplatos':
            consumoAhorroLavaplatos = consumoActual;
            break;
        }
      }
    });

    // Calcular totales según tu fórmula exacta
    const consumoActual = consumoActualDucha + consumoActualLavamanos + consumoActualWc + 
                         consumoActualLavaplatos + consumoActualLavadora;
    
    const consumoAhorro = consumoAhorroDucha + consumoAhorroLavamanos + consumoAhorroWc + consumoAhorroLavaplatos;
    
    // Ahorro final CORREGIDO: ahorroM3Mes = consumoActual - consumoAhorro (SIN el signo negativo)
    const ahorroM3Mes = -(consumoActual - consumoAhorro);

    // Calcular ahorroDineroMes según nueva fórmula: ahorroM3Mes * (PrecioTotalDelAgua / consumoActual)
    const precioTotalAgua = parseFloat(calcularPrecioTotal()) || 0;
    const valorM3Mes = consumoActual > 0 ? precioTotalAgua / consumoActual : 0;
    const ahorroDineroMes = ahorroM3Mes * valorM3Mes;
    
    // Calcular retornoMeses según nueva fórmula: inversionTotal / ahorroDineroMes (redondeado a entero)
    // Agregar validación para evitar división por cero
    let retornoMeses = 0;
    if ((-ahorroDineroMes) > 0 && inversionTotal > 0) {
      retornoMeses = Math.round(inversionTotal / -(ahorroDineroMes));
    }
    
    // Calcular equivalenteTinas según nueva fórmula: ahorroM3Mes * valorTina (redondeado a entero)
    const equivalenteTinas = Math.round((-ahorroM3Mes) * valorTina);

    console.log('📈 Resultados finales EXACTOS:');
    console.log('Consumo Actual Ducha:', consumoActualDucha.toFixed(2));
    console.log('Consumo Actual Lavamanos:', consumoActualLavamanos.toFixed(2));
    console.log('Consumo Actual WC:', consumoActualWc.toFixed(2));
    console.log('Consumo Actual Lavaplatos:', consumoActualLavaplatos.toFixed(2));
    console.log('Consumo Actual Lavadora:', consumoActualLavadora.toFixed(2));
    console.log('TOTAL CONSUMO ACTUAL:', consumoActual.toFixed(2));
    console.log('---');
    console.log('Consumo Ahorro Ducha:', consumoAhorroDucha.toFixed(2));
    console.log('Consumo Ahorro Lavamanos:', consumoAhorroLavamanos.toFixed(2));
    console.log('Consumo Ahorro WC:', consumoAhorroWc.toFixed(2));
    console.log('Consumo Ahorro Lavaplatos:', consumoAhorroLavaplatos.toFixed(2));
    console.log('TOTAL CONSUMO AHORRO:', consumoAhorro.toFixed(2));
    console.log('---');
    console.log('AHORRO M3/MES:', ahorroM3Mes.toFixed(2));
    console.log('PRECIO TOTAL AGUA:', precioTotalAgua);
    console.log('VALOR M3/MES:', valorM3Mes.toFixed(2));
    console.log('AHORRO DINERO/MES:', ahorroDineroMes.toFixed(0));
    console.log('INVERSIÓN TOTAL:', Math.round(inversionTotal));
    console.log('RETORNO MESES:', retornoMeses);
    console.log('VALOR TINA:', valorTina);
    console.log('EQUIVALENTE TINAS:', equivalenteTinas);

    setResultados({
      ahorroM3Mes: ahorroM3Mes.toFixed(2),
      ahorroDineroMes: ahorroDineroMes.toFixed(0),
      inversionTotal: Math.round(inversionTotal),
      retornoMeses: retornoMeses,
      equivalenteTinas: equivalenteTinas
    });
  }, [precioAgua, numeroPersonas, medidasSeleccionadas, cantidadArtefactos, artefactosData, valorTina]);

  const validarFormulario = () => {
    const nuevosErrores = {};

    // Validar campos obligatorios
    if (!precioAgua.consumoAguaPotable || precioAgua.consumoAguaPotable === '') {
      nuevosErrores.consumoAguaPotable = 'El consumo de agua potable es obligatorio';
    } else if (parseFloat(precioAgua.consumoAguaPotable) <= 0) {
      nuevosErrores.consumoAguaPotable = 'El consumo debe ser mayor a 0';
    }

    if (!precioAgua.servicioAlcantarillado || precioAgua.servicioAlcantarillado === '') {
      nuevosErrores.servicioAlcantarillado = 'El servicio de alcantarillado es obligatorio';
    } else if (parseFloat(precioAgua.servicioAlcantarillado) < 0) {
      nuevosErrores.servicioAlcantarillado = 'El servicio no puede ser negativo';
    }

    if (!numeroPersonas || numeroPersonas < 1) {
      nuevosErrores.numeroPersonas = 'Debe haber al menos 1 persona en el hogar';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Función para guardar evaluación en la BD - MODIFICADA
  const guardarEvaluacion = async () => {
    // Validar antes de guardar
    if (!validarFormulario()) {
      showError('Por favor, completa todos los campos obligatorios correctamente');
      return;
    }

    // Validar que haya al menos una medida seleccionada
    if (!hayMedidasSeleccionadas()) {
      showError('Debes seleccionar al menos una medida de ahorro para guardar la evaluación');
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('No estás autenticado. Por favor, inicia sesión nuevamente.');
        setGuardando(false);
        return;
      }

      console.log('💾 Guardando evaluación de agua...');

      // Preparar datos para enviar
      const datosEvaluacion = {
        precio_agua: parseInt(calcularPrecioTotal()),
        consumo_agua_potable: parseInt(precioAgua.consumoAguaPotable),
        servicio_alcantarillado: parseInt(precioAgua.servicioAlcantarillado || 0),
        
        // Cantidades de artefactos
        cantidad_duchas: cantidadArtefactos.ducha || 1,
        cantidad_lavamanos: cantidadArtefactos.lavamanos || 1,
        cantidad_wc: cantidadArtefactos.wc || 1,
        cantidad_lavaplatos: cantidadArtefactos.lavaplatos || 1,
        
        // IDs de las medidas seleccionadas
        medida_ducha: medidasSeleccionadas.ducha?.id || null,
        medida_lavamanos: medidasSeleccionadas.lavamanos?.id || null,
        medida_wc: medidasSeleccionadas.wc?.id || null,
        medida_lavaplatos: medidasSeleccionadas.lavaplatos?.id || null,
        
        // Resultados calculados
        ahorro_m3_mes: parseFloat(resultados.ahorroM3Mes),
        ahorro_dinero: parseFloat(resultados.ahorroDineroMes),
        inversion: parseInt(resultados.inversionTotal),
        retorno: parseInt(resultados.retornoMeses),
        equivalente_tinas: parseInt(resultados.equivalenteTinas)
      };

      console.log('📤 Datos a guardar:', datosEvaluacion);

      const response = await fetch('http://localhost:5000/api/evaluacion-agua/guardar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosEvaluacion)
      });

      const result = await response.json();
      console.log('📨 Respuesta del servidor:', result);

      if (result.success) {
        setGuardadoExitoso(true);
        showSuccess('Evaluación guardada exitosamente');
      } else {
        // Manejar caso de evaluación duplicada
        if (response.status === 409) {
          showWarning('Ya existe una evaluación idéntica');
        } else {
          throw new Error(result.error || 'Error desconocido al guardar');
        }
      }

    } catch (error) {
      console.error('❌ Error guardando evaluación:', error);
      showError(`Error al guardar: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  // Función para manejar nueva evaluación
  const handleNuevaEvaluacion = () => {
    setGuardadoExitoso(false);
    setPrecioAgua({ consumoAguaPotable: '', servicioAlcantarillado: '' });
    setMedidasSeleccionadas({});
    showInfo('Puedes comenzar una nueva evaluación');
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
          <h1 className="form-title">Evaluación de Ahorro de Agua</h1>
        </div>

        {guardadoExitoso ? (
          <div className="mensaje-exito valoracion-exito">
            <div className="icono-exito">✓</div>
            <h2 className="exito-titulo">¡Evaluación Guardada Exitosamente!</h2>
            <p className="exito-mensaje">
              Tu evaluación de ahorro de agua ha sido guardada correctamente. 
              Puedes ver tus evaluaciones anteriores en tu historial.
            </p>
            <button 
              className="submit-btn btn-centrado"
              onClick={handleNuevaEvaluacion}
            >
              Realizar nueva evaluación
            </button>
          </div>
        ) : (
          <>
            {/* Sección de información básica */}
            <div className="form-section">
              <h2>Información Básica</h2>
              
              {/* Mensaje de error en carga */}
              {errorCarga && (
                <div className="error-message" style={{marginBottom: '15px'}}>
                  <strong>⚠️ Error:</strong> {errorCarga}
                  <br />
                  <button 
                    onClick={recargarDatosVivienda}
                    className="btn-reintentar"
                  >
                    Reintentar carga
                  </button>
                </div>
              )}
              
              {/* Número de personas con opción de edición */}
              <div className="input-group">
                <div className="edicion-personas-container">
                  <label className="input-label">
                    Número de personas en el hogar *
                    {cargandoDatos && <span className="estado-carga">(Cargando...)</span>}
                  </label>
                  {!editandoPersonas ? (
                    <button 
                      type="button"
                      onClick={() => setEditandoPersonas(true)}
                      className="btn-editar"
                      disabled={cargandoDatos || !!errorCarga}
                    >
                      ✏️ Editar
                    </button>
                  ) : (
                    <div className="botones-edicion">
                      <button 
                        type="button"
                        onClick={guardarPersonas}
                        disabled={cargandoPersonas || !numeroPersonas || numeroPersonas < 1}
                        className="btn-guardar"
                      >
                        {cargandoPersonas ? '💾 Guardando...' : '💾 Guardar'}
                      </button>
                      <button 
                        type="button"
                        onClick={handleCancelarEdicion}
                        disabled={cargandoPersonas}
                        className="btn-cancelar"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  )}
                </div>
                
                {editandoPersonas ? (
                  <>
                    <input
                      type="number"
                      value={numeroPersonas}
                      onChange={(e) => handlePersonasChange(e.target.value)}
                      min="1"
                      placeholder="Ej: 4"
                      disabled={cargandoPersonas}
                      className={errores.numeroPersonas ? 'error-input' : ''}
                    />
                    {errores.numeroPersonas && (
                      <div className="error-mensaje-campo">{errores.numeroPersonas}</div>
                    )}
                  </>
                ) : (
                  <div className="info-display">
                    {cargandoDatos ? 'Cargando...' : `${numeroPersonas} persona${numeroPersonas !== 1 ? 's' : ''}`}
                  </div>
                )}
                <small className="info-small">
                  {cargandoDatos 
                    ? 'Obteniendo información de tu perfil...' 
                    : 'Esta información se obtuvo de tu perfil. Puedes editarla si ha cambiado.'}
                </small>
              </div>

              <div className="input-group">
                <label className="input-label">Consumo Agua Potable ($/m³) *</label>
                <input
                  type="number"
                  value={precioAgua.consumoAguaPotable}
                  onChange={(e) => {
                    handlePrecioChange('consumoAguaPotable', e.target.value);
                    // Limpiar error cuando el usuario empiece a escribir
                    if (errores.consumoAguaPotable) {
                      setErrores(prev => ({ ...prev, consumoAguaPotable: '' }));
                    }
                  }}
                  min="1"
                  step="1"
                  placeholder="Ej: 1000"
                  className={errores.consumoAguaPotable ? 'error-input' : ''}
                />
                {errores.consumoAguaPotable && (
                  <div className="error-mensaje-campo">{errores.consumoAguaPotable}</div>
                )}
                <small className="info-small">
                  Esta información se obtiene directamente desde tu boleta del agua.
                </small>
              </div>

              <div className="input-group">
                <label className="input-label">Servicio de Alcantarillado ($/m³) *</label>
                <input
                  type="number"
                  value={precioAgua.servicioAlcantarillado}
                  onChange={(e) => {
                    handlePrecioChange('servicioAlcantarillado', e.target.value);
                    // Limpiar error cuando el usuario empiece a escribir
                    if (errores.servicioAlcantarillado) {
                      setErrores(prev => ({ ...prev, servicioAlcantarillado: '' }));
                    }
                  }}
                  min="0"
                  step="1"
                  placeholder="Ej: 1000"
                  className={errores.servicioAlcantarillado ? 'error-input' : ''}
                />
                {errores.servicioAlcantarillado && (
                  <div className="error-mensaje-campo">{errores.servicioAlcantarillado}</div>
                )}
                <small className="info-small">
                  Esta información se obtiene directamente desde tu boleta del agua.
                </small>
              </div>

              {/* MOSTRAR SUMA DE PRECIOS EN TIEMPO REAL */}
              <div className="precio-total-container">
                <div className="precio-total-content">
                  <span className="precio-total-label">
                    Precio total del agua ($/m³):
                  </span>
                  <span className="precio-total-valor">
                    ${calcularPrecioTotal()}
                  </span>
                </div>
                <small className="precio-total-small">
                  Suma de Agua Potable + Alcantarillado
                </small>
              </div>
            </div>

            {/* Sección de artefactos y medidas de ahorro */}
            <div className="form-section">
              <h2>Selecciona Medidas de Ahorro</h2>
              
              {cargandoArtefactos ? (
                <div className="cargando">
                  <p>Cargando artefactos...</p>
                </div>
              ) : (
                artefactosData
                  .filter(artefacto => ['ducha', 'lavamanos', 'wc', 'lavaplatos'].includes(artefacto.id))
                  .map(artefacto => (
                    <div key={artefacto.id} className="artefacto-container">
                      {/* Header del artefacto */}
                      <div className="artefacto-header">
                        <img 
                          src={artefacto.imagen} 
                          alt={artefacto.nombre}
                          className="artefacto-imagen"
                        />
                        <div className="artefacto-info">
                          <h3 className="artefacto-nombre">
                            {artefacto.nombre}
                          </h3>
                          {/* Input para cantidad de artefactos */}
                          <div className="artefacto-cantidad">
                            <label className="cantidad-label">
                              Cantidad:
                            </label>
                            <input
                              type="number"
                              value={cantidadArtefactos[artefacto.id] ?? 1}
                              onChange={(e) => handleCantidadArtefactoChange(artefacto.id, e.target.value)}
                              min="0"
                              className="cantidad-input"
                              placeholder="1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Medidas de ahorro */}
                      {artefacto.medidas.length > 0 ? (
                        <div>
                          <h4 className="input-label">
                            Selecciona una medida de ahorro:
                          </h4>
                          <div className="medidas-grid">
                            {artefacto.medidas.map(medida => (
                              <div
                                key={medida.id}
                                onClick={() => handleMedidaSelect(artefacto.id, medida)}
                                className={`medida-card ${medidasSeleccionadas[artefacto.id]?.id === medida.id ? 'seleccionada' : ''}`}
                              >
                                <img 
                                  src={medida.imagen} 
                                  alt={medida.nombre}
                                  className="medida-imagen"
                                />
                                <div className="medida-nombre">
                                  {medida.nombre}
                                </div>
                                <div className="medida-ahorro">
                                  Ahorro: {medida.ahorroConservador}%
                                </div>
                                <div className="medida-precio">
                                  ${medida.precioUnitario.toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="sin-datos">
                          No hay medidas de ahorro disponibles para este artefacto
                        </div>
                      )}

                      {/* Display de ahorro seleccionado */}
                      <div className="ahorro-display">
                        <span className="ahorro-label">
                          Ahorro seleccionado:
                        </span>
                        <span className="ahorro-valor">
                          {getPorcentajeAhorro(artefacto.id)}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Resultados */}
            <div className="form-section">
              <h2>Resultados de la Evaluación</h2>
              <div className="resultados-table">
                <div className="resultado-fila">
                  <div className="resultado-label">Ahorro en m³</div>
                  <div className="resultado-valor">
                    {hayMedidasSeleccionadas() ? `(${resultados.ahorroM3Mes}) m3/mes` : '(0) m3/mes'}
                  </div>
                </div>
                <div className="resultado-fila">
                  <div className="resultado-label">Ahorro en $</div>
                  <div className="resultado-valor">
                    {hayMedidasSeleccionadas() ? `(${resultados.ahorroDineroMes}) $/mes` : '(0) $/mes'}
                  </div>
                </div>
                <div className="resultado-fila">
                  <div className="resultado-label">Inversión</div>
                  <div className="resultado-valor">({resultados.inversionTotal}) $</div>
                </div>
                <div className="resultado-fila">
                  <div className="resultado-label">Retorno de inversión</div>
                  <div className="resultado-valor">({resultados.retornoMeses}) meses</div>
                </div>
                <div className="resultado-fila">
                  <div className="resultado-label">Tina de baño</div>
                  <div className="resultado-valor">({valorTina}) m3</div>
                </div>
                <div className="resultado-fila">
                  <div className="resultado-label">Equivalente en tinas</div>
                  <div className="resultado-valor ahorro-destacado">
                    ({resultados.equivalenteTinas}) tinas/mes
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              className="submit-btn btn-centrado"
              onClick={guardarEvaluacion}
              disabled={guardando || !hayMedidasSeleccionadas()}
            >
              {guardando ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          </>
        )}
      </div>
    </Layout>
  );
};

export default EvaluacionAgua;