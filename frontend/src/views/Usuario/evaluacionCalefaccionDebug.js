import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import NotificationContainer from '../../components/NotificationContainer';
import { useNotification } from '../../hooks/useNotification';
import '../styles.css';

function EvaluacionCalefaccion() {
  // Estados para las superficies
  const [superficies, setSuperficies] = useState({
    superficie_1: '',
    superficie_2: ''
  });
  const [editandoSuperficies, setEditandoSuperficies] = useState(false);
  const [cargandoSuperficies, setCargandoSuperficies] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  
  // Estado para el guardado exitoso
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estados para los campos del formulario
  const [formData, setFormData] = useState({
    // Primer piso
    muroEstructuraPiso1: '',
    muroAislacionTipoPiso1: '',
    muroAislacionEspesorPiso1: '',
    
    // Segundo piso
    muroEstructuraPiso2: '',
    muroAislacionTipoPiso2: '',
    muroAislacionEspesorPiso2: '',
    
    // Techos
    techoEstructura: '',
    techoAislacionTipo: '',
    techoAislacionEspesor: '',
    
    // Ventanas
    ventanaTipo: '',
    ventanaMarco: '',
    ventanaAreaPiso1: '',
    ventanaAreaPiso2: '',
    
    // Sistema de calefacción
    sistemaCalefaccion: '',
    consumoAnual: '',
    
    // Soluciones de mejora
    solucionMejoraMuroPiso1: '',
    solucionMejoraMuroPiso2: '',
    solucionMejoraTecho: '',
    solucionMejoraVentana: ''
  });

  // Estado para errores del formulario
  const [errores, setErrores] = useState({});

  // Estados para los datos de la base de datos
  const [materiales, setMateriales] = useState({
    muros: [],
    aislantesMuroAgrupados: {},
    techos: [],
    aislantesTechoAgrupados: {},
    ventanasTipos: [],
    ventanasMarcos: {},
    sistemasCalefaccion: [],
    solucionesMuro: [],
    solucionesTecho: [],
    solucionesVentana: [],
    aislantesMuroCompletos: [],
    aislantesTechoCompletos: [],
    ventanasCompletas: [],
    preciosUnitarios: []
  });

  const [cargandoMateriales, setCargandoMateriales] = useState(true);
  const [cargandoSoluciones, setCargandoSoluciones] = useState(false);

  // Estado para los resultados
  const [resultados, setResultados] = useState({
    eficiencia: 0,
    inversion: 0,
    ahorroAnual: 0,
    payback: 0,
    reduccionCO2: 0
  });

  // Estado para los cálculos intermedios
  const [calculosIntermedios, setCalculosIntermedios] = useState({
    perimetroPiso1: 0,
    perimetroPiso2: 0,
    areaSuperficieVerticalPiso1: 0,
    areaSuperficieVerticalPiso2: 0,
    volumen: 0,
    areaVentanaPiso1: 0,
    areaVentanaPiso2: 0,
    areaMuroPiso1: 0,
    areaMuroPiso2: 0
  });

  // Estado para debug detallado
  const [debugDetallado, setDebugDetallado] = useState({
    valoresR: {
      estructura_muro_p1: 0,
      aislante_muro_p1: 0,
      estructura_muro_p2: 0,
      aislante_muro_p2: 0,
      estructura_techo: 0,
      aislante_techo: 0,
      u_ventana: 0,
      r_solucion_muro: 0,
      r_solucion_muro2: 0
    },
    coeficientesU: {
      um1: 0,
      um2: 0,
      uv: 0,
      ut: 0,
      um1n: 0,
      um2n: 0
    },
    perdidasCalor: {
      hm1: 0,
      hm2: 0,
      hv1: 0,
      hv2: 0,
      ht: 0,
      hv: 0,
      HT: 0,
      hm1n: 0,
      hm2n: 0,
      hvn1: 0,
      Htn: 0
    },
    precios: {
      precioKW: 0,
      precio_muro_p1: 0,
      precio_muro_p2: 0,
      precio_techo: 0,
      precio_ventana_m2: 0,
      precioKwh: 0
    },
    inversiones: {
      inversion1: 0,
      inversion2: 0,
      inversion3: 0,
      inversion4: 0,
      inversionTotal: 0
    },
    ahorrosCO2: {
      ahorro1: 0,
      ahorro2: 0,
      ahorro3: 0,
      ahorro4: 0,
      reduccionCO2: 0
    }
  });

  // Usar el hook de notificaciones
  const { notifications, removeNotification, showSuccess, showError, showInfo, showWarning } = useNotification();

  // FUNCIÓN PARA OBTENER PRECIO_KWH DEL SISTEMA SELECCIONADO
  const getPrecioKwh = (sistemaNombre) => {
    if (!sistemaNombre) return 0;
    
    const sistema = materiales.sistemasCalefaccion.find(s => s.nombre === sistemaNombre);
    return sistema ? parseFloat(sistema.precio_kwh) || 0 : 0;
  };

  // FUNCIÓN PARA OBTENER ID DEL COMBUSTIBLE
  const getIdCombustible = (sistemaNombre) => {
    if (!sistemaNombre) return null;
    
    const sistema = materiales.sistemasCalefaccion.find(s => s.nombre === sistemaNombre);
    return sistema ? sistema.id : null;
  };

  // FUNCIÓN PARA OBTENER IDS DE LAS SOLUCIONES SELECCIONADAS
  const getIdsSoluciones = () => {
    // Solución muro piso 1
    const solucionMuroPiso1 = getSolucionesMuroPiso1().find(s => s.solucion === formData.solucionMejoraMuroPiso1);
    const id_solucion_muro1 = solucionMuroPiso1 ? solucionMuroPiso1.id : null;

    // Solución muro piso 2
    const solucionMuroPiso2 = getSolucionesMuroPiso2().find(s => s.solucion === formData.solucionMejoraMuroPiso2);
    const id_solucion_muro2 = solucionMuroPiso2 ? solucionMuroPiso2.id : null;

    // Solución techo
    const solucionTecho = getSolucionesTecho().find(s => s.solucion === formData.solucionMejoraTecho);
    const id_solucion_techo = solucionTecho ? solucionTecho.id : null;

    // Solución ventana
    const solucionVentana = getSolucionesVentana().find(s => s.id.toString() === formData.solucionMejoraVentana);
    const id_solucion_ventana = solucionVentana ? solucionVentana.id : null;

    return {
      id_solucion_muro1,
      id_solucion_muro2,
      id_solucion_techo,
      id_solucion_ventana
    };
  };

  // FUNCIÓN PARA CALCULAR EFICIENCIA SEGÚN NUEVA FÓRMULA
  const calcularEficiencia = () => {
    const consumoAnual = parseFloat(formData.consumoAnual) || 0;
    const precioKwh = getPrecioKwh(formData.sistemaCalefaccion);
    const superficieTotal = (parseFloat(superficies.superficie_1) || 0) + (parseFloat(superficies.superficie_2) || 0);
    
    if (!consumoAnual || !precioKwh || !superficieTotal || superficieTotal <= 0) {
      return 0;
    }
    
    // Nueva fórmula: Eficiencia = (consumoAnual / precio_kwh) / (superficie_1 + superficie_2)
    const eficiencia = (consumoAnual / precioKwh) / superficieTotal;
    
    console.log('📈 CÁLCULO EFICIENCIA (NUEVA FÓRMULA):', {
      consumoAnual,
      precioKwh,
      superficieTotal,
      eficiencia
    });
    
    return isNaN(eficiencia) || !isFinite(eficiencia) ? 0 : eficiencia;
  };

  // FUNCIÓN PARA OBTENER COLOR SEGÚN RANGO DE EFICIENCIA
  const getColorEficiencia = (eficiencia) => {
    if (eficiencia <= 15) return '#2E7D32'; // Verde oscuro
    if (eficiencia <= 55) return '#4CAF50'; // Verde claro
    if (eficiencia <= 90) return '#FFEB3B'; // Amarillo
    if (eficiencia <= 130) return '#FF9800'; // Naranjo
    return '#F44336'; // Rojo
  };

  // FUNCIÓN PARA OBTENER POSICIÓN EN LA BARRA DE GRADIENTE
  const getPosicionBarra = (eficiencia) => {
    // Normalizar la posición basada en el rango máximo (160 kWh/m² año)
    const maxEficiencia = 160;
    const posicion = Math.min((eficiencia / maxEficiencia) * 100, 100);
    return posicion;
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
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const result = await response.json();
        console.log('📊 Respuesta de vivienda/datos:', result);

        if (result.success && result.vivienda) {
          const superficie1 = result.vivienda.superficie_1;
          const superficie2 = result.vivienda.superficie_2;
          console.log('✅ Superficies obtenidas de BD:', superficie1, superficie2);
          
          setSuperficies({
            superficie_1: superficie1 || '',
            superficie_2: superficie2 || ''
          });
          setErrorCarga('');
        } else {
          throw new Error(result.error || 'No se pudieron cargar los datos de la vivienda');
        }
      } catch (error) {
        console.error('❌ Error cargando datos de vivienda:', error);
        setErrorCarga(error.message);
      } finally {
        setCargandoDatos(false);
      }
    };

    cargarDatosVivienda();
  }, []);

  // FUNCIÓN PARA CALCULAR ÁREAS Y VOLÚMENES
  const calcularAreasYVolumenes = () => {
    const superficie1 = parseFloat(superficies.superficie_1) || 0;
    const superficie2 = parseFloat(superficies.superficie_2) || 0;
    
    console.log('📏 Calculando áreas y volúmenes para superficies:', { superficie1, superficie2 });
    
    if (superficie1 <= 0) {
      console.log('❌ Superficie no válida para cálculo');
      return {
        perimetroPiso1: 0,
        perimetroPiso2: 0,
        areaSuperficieVerticalPiso1: 0,
        areaSuperficieVerticalPiso2: 0,
        volumen: 0,
        areaVentanaPiso1: 0,
        areaVentanaPiso2: 0,
        areaMuroPiso1: 0,
        areaMuroPiso2: 0
      };
    }
    
    const relacionLargoAncho = 1.5;
    const alturaPiso = 2.5;
    
    // Calcular dimensiones del primer piso
    const anchoPiso1 = Math.sqrt(superficie1 / relacionLargoAncho);
    const largoPiso1 = superficie1 / anchoPiso1;
    
    // Calcular perímetros
    const perimetroPiso1 = 2 * (largoPiso1 + anchoPiso1);
    const perimetroPiso2 = superficie2 > 0 ? 2 * (Math.sqrt(superficie2 / relacionLargoAncho) + (superficie2 / Math.sqrt(superficie2 / relacionLargoAncho))) : 0;
    
    // Calcular áreas de superficies verticales
    const areaSuperficieVerticalPiso1 = perimetroPiso1 * alturaPiso;
    const areaSuperficieVerticalPiso2 = perimetroPiso2 * alturaPiso;
    
    // Calcular volumen
    const volumen = (superficie1 + superficie2) * alturaPiso;
    
    // Calcular áreas de ventanas
    const porcentajeVentanaPiso1 = parseFloat(formData.ventanaAreaPiso1) || 0;
    const porcentajeVentanaPiso2 = parseFloat(formData.ventanaAreaPiso2) || 0;
    
    const areaVentanaPiso1 = (areaSuperficieVerticalPiso1 * porcentajeVentanaPiso1) / 100;
    const areaVentanaPiso2 = (areaSuperficieVerticalPiso2 * porcentajeVentanaPiso2) / 100;
    
    // Calcular áreas de muro
    const areaMuroPiso1 = areaSuperficieVerticalPiso1 - areaVentanaPiso1;
    const areaMuroPiso2 = areaSuperficieVerticalPiso2 - areaVentanaPiso2;

    const calculos = {
      perimetroPiso1,
      perimetroPiso2,
      areaSuperficieVerticalPiso1,
      areaSuperficieVerticalPiso2,
      volumen,
      areaVentanaPiso1,
      areaVentanaPiso2,
      areaMuroPiso1,
      areaMuroPiso2
    };

    console.log('📐 Cálculos intermedios:', calculos);
    setCalculosIntermedios(calculos);

    return calculos;
  };

  // FUNCIÓN CORREGIDA: Obtener valor R de muro
  const getValorRMuro = (elementoMuro) => {
    if (!elementoMuro) {
      console.log('❌ No hay elemento de muro seleccionado');
      return 0;
    }

    const muro = materiales.muros.find(m => m.elemento === elementoMuro);
    
    console.log('🔍 Buscando muro:', {
      buscando: elementoMuro,
      encontrado: !!muro,
      valor: muro ? muro.valor : 'NO ENCONTRADO'
    });

    return muro ? parseFloat(muro.valor) : 0;
  };

  // FUNCIÓN CORREGIDA: Obtener valor R de aislante muro
  const getValorRAislanteMuro = (tipoAislante, espesor) => {
    if (!tipoAislante || tipoAislante === 'Sin aislante') {
      console.log('🔍 Aislante: Sin aislante');
      return 0;
    }

    console.log('🔍 Buscando aislante:', {
      tipo: tipoAislante,
      espesor: espesor,
      totalAislantes: materiales.aislantesMuroCompletos.length
    });

    const aislante = materiales.aislantesMuroCompletos.find(a => {
      const elemento = a.elemento.toLowerCase();
      const tipoBuscado = tipoAislante.toLowerCase();
      const espesorBuscado = espesor ? espesor.toLowerCase() : '';
      
      const coincideTipo = elemento.includes(tipoBuscado);
      const coincideEspesor = !espesor || elemento.includes(espesorBuscado);
      
      return coincideTipo && coincideEspesor;
    });

    console.log('🔍 Resultado búsqueda aislante:', {
      encontrado: !!aislante,
      elemento: aislante ? aislante.elemento : 'NO ENCONTRADO',
      valor: aislante ? aislante.valor : 0
    });

    return aislante ? parseFloat(aislante.valor) : 0;
  };

  // FUNCIÓN PARA OBTENER VALOR R DE TECHO
  const getValorRTecho = (elementoTecho) => {
    const techo = materiales.techos.find(t => t.elemento === elementoTecho);
    return techo ? parseFloat(techo.valor) : 0;
  };

  // FUNCIÓN PARA OBTENER VALOR R DE AISLANTE TECHO
  const getValorRAislanteTecho = (tipoAislante, espesor) => {
    if (!tipoAislante || tipoAislante === 'Sin aislante') return 0;
    
    const aislante = materiales.aislantesTechoCompletos.find(a => {
      const elemento = a.elemento.toLowerCase();
      const tipoBuscado = tipoAislante.toLowerCase();
      const espesorBuscado = espesor ? espesor.toLowerCase() : '';
      
      return elemento.includes(tipoBuscado) && (!espesor || elemento.includes(espesorBuscado));
    });
    
    return aislante ? parseFloat(aislante.valor) : 0;
  };

  // FUNCIÓN PARA OBTENER VALOR U DE VENTANA
  const getValorUVentana = (tipoVentana, marcoVentana) => {
    if (!tipoVentana || !marcoVentana) return 0;
    
    const ventana = materiales.ventanasCompletas.find(v => {
      const elemento = v.elemento.toLowerCase();
      const tipoBuscado = tipoVentana.toLowerCase();
      const marcoBuscado = marcoVentana.toLowerCase();
      
      return elemento.includes(tipoBuscado) && elemento.includes(marcoBuscado);
    });
    
    return ventana ? parseFloat(ventana.valor) : 0;
  };

  // FUNCIÓN PARA OBTENER PRECIO UNITARIO DESDE LA BD
  const getPrecioUnitario = async (idPrecioUnitario) => {
    if (!idPrecioUnitario) return 0;
    
    try {
      const response = await fetch(`http://localhost:5000/api/precios-unitarios/precio/${idPrecioUnitario}`);
      if (response.ok) {
        const result = await response.json();
        return result.data?.precio_total || 0;
      }
    } catch (error) {
      console.error('❌ Error obteniendo precio unitario:', error);
    }
    return 0;
  };

  // FUNCIÓN CORREGIDA: Calcular resultados completos
  const calcularResultadosCompletos = async () => {
    console.log('=== INICIANDO CÁLCULO COMPLETO ===');
    
    if (!superficies.superficie_1 || superficies.superficie_1 <= 0) {
      console.log('❌ No hay superficie válida para calcular');
      return;
    }

    const consumoAnual = parseFloat(formData.consumoAnual) || 0;
    console.log('💰 Consumo anual:', consumoAnual);

    if (!consumoAnual || consumoAnual <= 0) {
      console.log('❌ Consumo anual no válido');
      setResultados({
        eficiencia: 0,
        inversion: 0,
        ahorroAnual: 0,
        payback: 0,
        reduccionCO2: 0
      });
      return;
    }

    // Obtener cálculos de áreas
    const calculos = calcularAreasYVolumenes();
    console.log('📐 Cálculos de áreas:', calculos);

    // Obtener valores R/U con debug
    const valor_r_estructura_muro_primer_piso = getValorRMuro(formData.muroEstructuraPiso1);
    const valor_r_aislante_muro_primer_piso = getValorRAislanteMuro(formData.muroAislacionTipoPiso1, formData.muroAislacionEspesorPiso1);
    
    const valor_r_estructura_muro_segundo_piso = getValorRMuro(formData.muroEstructuraPiso2);
    const valor_r_aislante_muro_segundo_piso = getValorRAislanteMuro(formData.muroAislacionTipoPiso2, formData.muroAislacionEspesorPiso2);
    
    const valor_r_estructura_techo = getValorRTecho(formData.techoEstructura);
    const valor_r_aislante_techo = getValorRAislanteTecho(formData.techoAislacionTipo, formData.techoAislacionEspesor);
    
    const valor_u_ventana = getValorUVentana(formData.ventanaTipo, formData.ventanaMarco);

    console.log('🏗️ VALORES R/U OBTENIDOS:', {
      estructura_p1: valor_r_estructura_muro_primer_piso,
      aislante_p1: valor_r_aislante_muro_primer_piso,
      estructura_p2: valor_r_estructura_muro_segundo_piso,
      aislante_p2: valor_r_aislante_muro_segundo_piso,
      estructura_techo: valor_r_estructura_techo,
      aislante_techo: valor_r_aislante_techo,
      u_ventana: valor_u_ventana
    });

    // Obtener soluciones seleccionadas
    const solucionMuroPiso1 = getSolucionesMuroPiso1().find(s => s.solucion === formData.solucionMejoraMuroPiso1);
    const valor_r_solucion_muro = solucionMuroPiso1 ? parseFloat(solucionMuroPiso1.r_solucion) : 0;

    const solucionMuroPiso2 = getSolucionesMuroPiso2().find(s => s.solucion === formData.solucionMejoraMuroPiso2);
    const valor_r_solucion_muro2 = solucionMuroPiso2 ? parseFloat(solucionMuroPiso2.r_solucion) : 0;

    const precio_total_solucionMuroPiso1 = solucionMuroPiso1 ? await getPrecioUnitario(solucionMuroPiso1.id_precio_unitario) : 0;
    const precio_total_solucionMuroPiso2 = solucionMuroPiso2 ? await getPrecioUnitario(solucionMuroPiso2.id_precio_unitario) : 0;

    const solucionTecho = getSolucionesTecho().find(s => s.solucion === formData.solucionMejoraTecho);
    const precio_total_solucionTecho = solucionTecho ? await getPrecioUnitario(solucionTecho.id_precio_unitario) : 0;

    const solucionVentana = getSolucionesVentana().find(s => s.id.toString() === formData.solucionMejoraVentana);
    const precio_m2_solucionVentana = solucionVentana ? parseFloat(solucionVentana.precio_m2) : 0;

    console.log('🔧 SOLUCIONES SELECCIONADAS:', {
      solucion_muro_p1: {
        nombre: formData.solucionMejoraMuroPiso1,
        r_solucion: valor_r_solucion_muro,
        precio: precio_total_solucionMuroPiso1
      },
      solucion_muro_p2: {
        nombre: formData.solucionMejoraMuroPiso2,
        r_solucion: valor_r_solucion_muro2,
        precio: precio_total_solucionMuroPiso2
      },
      solucion_techo: {
        nombre: formData.solucionMejoraTecho,
        precio: precio_total_solucionTecho
      },
      solucion_ventana: {
        id: formData.solucionMejoraVentana,
        precio_m2: precio_m2_solucionVentana
      }
    });

    // ============ CÁLCULO DE COEFICIENTES U ============
    const um1 = 1 / (valor_r_estructura_muro_primer_piso + valor_r_aislante_muro_primer_piso + 0.17);
    const um2 = (1 / (valor_r_estructura_muro_segundo_piso + 0.17)) * 0.2 + (1 / (valor_r_aislante_muro_segundo_piso + 0.17)) * 0.8;
    const uv = valor_u_ventana;
    const ut = (1 / (valor_r_estructura_techo + 0.17)) * 0.1 + (1 / (valor_r_aislante_techo + 0.17)) * 0.9;

    // ============ CÁLCULO DE HT (PÉRDIDAS ACTUALES) ============
    const hm1 = calculos.areaMuroPiso1 * um1;
    const hm2 = calculos.areaMuroPiso2 * um2;
    const hv1 = calculos.areaVentanaPiso1 * uv;
    const hv2 = calculos.areaVentanaPiso2 * uv;
    const ht = ut * parseFloat(superficies.superficie_1);
    
    // CORRECCIÓN: hv = volumen * 2 * 1.63 (según tu fórmula)
    const hv = calculos.volumen * 2 * 1.63;

    const HT = hm1 + hm2 + hv1 + hv2 + ht + hv;

    if (HT <= 0) {
      console.log('❌ HT no válido:', HT);
      setResultados({
        eficiencia: 0,
        inversion: 0,
        ahorroAnual: 0,
        payback: 0,
        reduccionCO2: 0
      });
      return;
    }

    // ============ CÁLCULO DE PRECIO POR kW ============
    const precioKW = consumoAnual / HT;

    // ============ CÁLCULO CON MEJORAS (Htn) ============
    // CORRECCIÓN: um1n con solución para primer piso
    const um1n = 1 / (valor_r_estructura_muro_primer_piso + valor_r_aislante_muro_primer_piso + valor_r_solucion_muro + 0.17);
    const hm1n = calculos.areaMuroPiso1 * um1n;
    
    // CORRECCIÓN CRÍTICA: um2n según fórmula exacta proporcionada
    const um2n = (1 / (valor_r_estructura_muro_segundo_piso + 0.17)) * 0.2 + 
                 (1 / (valor_r_aislante_muro_segundo_piso + valor_r_solucion_muro2 + 0.17)) * 0.8;
    const hm2n = calculos.areaMuroPiso2 * um2n;
    
    const hvn1 = hv1 + hv2;

    const Htn = hm1n + hm2n + hvn1 + ht + hv;

    // ============ CÁLCULO DE INVERSIÓN ============
    const inversion1 = precio_total_solucionMuroPiso1 * calculos.areaMuroPiso1;
    const inversion2 = precio_total_solucionMuroPiso2 * calculos.areaMuroPiso2;
    const inversion3 = precio_m2_solucionVentana * (calculos.areaVentanaPiso1 + calculos.areaVentanaPiso2);
    const inversion4 = precio_total_solucionTecho * parseFloat(superficies.superficie_1);
    
    const inversionTotal = inversion1 + inversion2 + inversion3 + inversion4;

    // ============ CÁLCULO DE AHORRO ANUAL ============
    const ahorroAnual = consumoAnual - (precioKW * Htn);

    // ============ CÁLCULO DE PAYBACK ============
    const payback = inversionTotal > 0 && ahorroAnual > 0 ? inversionTotal / ahorroAnual : 0;

    // ============ CÁLCULO DE REDUCCIÓN CO2 ============
    const ahorro1 = consumoAnual - (precioKW * hm1n);
    const ahorro2 = consumoAnual - (precioKW * hm2n);
    const ahorro3 = consumoAnual - (precioKW * hvn1);
    const ahorro4 = consumoAnual - (precioKW * ht);
    const reduccionCO2 = ahorro1 + ahorro2 + ahorro3 + ahorro4;

    // ============ CÁLCULO DE EFICIENCIA (NUEVA FÓRMULA) ============
    const eficiencia = calcularEficiencia();

    console.log('🎯 RESULTADOS FINALES:', {
      eficiencia,
      inversionTotal,
      ahorroAnual,
      payback,
      reduccionCO2
    });

    // Establecer resultados finales con protección contra NaN/Infinity
    setResultados({
      eficiencia: isNaN(eficiencia) || !isFinite(eficiencia) ? 0 : eficiencia,
      inversion: isNaN(inversionTotal) || !isFinite(inversionTotal) ? 0 : inversionTotal,
      ahorroAnual: isNaN(ahorroAnual) || !isFinite(ahorroAnual) ? 0 : ahorroAnual,
      payback: isNaN(payback) || !isFinite(payback) ? 0 : payback,
      reduccionCO2: isNaN(reduccionCO2) || !isFinite(reduccionCO2) ? 0 : reduccionCO2
    });

    // Actualizar estado de debug detallado
    setDebugDetallado({
      valoresR: {
        estructura_muro_p1: valor_r_estructura_muro_primer_piso,
        aislante_muro_p1: valor_r_aislante_muro_primer_piso,
        estructura_muro_p2: valor_r_estructura_muro_segundo_piso,
        aislante_muro_p2: valor_r_aislante_muro_segundo_piso,
        estructura_techo: valor_r_estructura_techo,
        aislante_techo: valor_r_aislante_techo,
        u_ventana: valor_u_ventana,
        r_solucion_muro: valor_r_solucion_muro,
        r_solucion_muro2: valor_r_solucion_muro2
      },
      coeficientesU: {
        um1: um1,
        um2: um2,
        uv: uv,
        ut: ut,
        um1n: um1n,
        um2n: um2n
      },
      perdidasCalor: {
        hm1: hm1,
        hm2: hm2,
        hv1: hv1,
        hv2: hv2,
        ht: ht,
        hv: hv,
        HT: HT,
        hm1n: hm1n,
        hm2n: hm2n,
        hvn1: hvn1,
        Htn: Htn
      },
      precios: {
        precioKW: precioKW,
        precio_muro_p1: precio_total_solucionMuroPiso1,
        precio_muro_p2: precio_total_solucionMuroPiso2,
        precio_techo: precio_total_solucionTecho,
        precio_ventana_m2: precio_m2_solucionVentana,
        precioKwh: getPrecioKwh(formData.sistemaCalefaccion)
      },
      inversiones: {
        inversion1: inversion1,
        inversion2: inversion2,
        inversion3: inversion3,
        inversion4: inversion4,
        inversionTotal: inversionTotal
      },
      ahorrosCO2: {
        ahorro1: ahorro1,
        ahorro2: ahorro2,
        ahorro3: ahorro3,
        ahorro4: ahorro4,
        reduccionCO2: reduccionCO2
      }
    });
  };

  // Calcular eficiencia cuando cambien los datos relevantes
  useEffect(() => {
    if (formData.consumoAnual && formData.sistemaCalefaccion && superficies.superficie_1) {
      const nuevaEficiencia = calcularEficiencia();
      setResultados(prev => ({
        ...prev,
        eficiencia: nuevaEficiencia
      }));
    }
  }, [formData.consumoAnual, formData.sistemaCalefaccion, superficies.superficie_1, superficies.superficie_2]);

  // Calcular resultados cuando cambien los datos relevantes
  useEffect(() => {
    console.log('🔄 useEffect - Verificando condiciones para cálculo...');
    console.log('📋 Estado actual:', {
      superficie: superficies.superficie_1,
      consumoAnual: formData.consumoAnual,
      muroPiso1: formData.muroEstructuraPiso1,
      aislantePiso1: formData.muroAislacionTipoPiso1,
      solucionPiso1: formData.solucionMejoraMuroPiso1
    });

    if (superficies.superficie_1 && superficies.superficie_1 > 0 && 
        formData.consumoAnual && formData.consumoAnual > 0 &&
        formData.muroEstructuraPiso1) {
      console.log('✅ Condiciones cumplidas, calculando...');
      calcularResultadosCompletos();
    } else {
      console.log('⏸️ Condiciones no cumplidas para cálculo');
    }
  }, [
    formData.muroEstructuraPiso1,
    formData.muroAislacionTipoPiso1,
    formData.muroAislacionEspesorPiso1,
    formData.muroEstructuraPiso2,
    formData.muroAislacionTipoPiso2,
    formData.muroAislacionEspesorPiso2,
    formData.techoEstructura,
    formData.techoAislacionTipo,
    formData.techoAislacionEspesor,
    formData.ventanaTipo,
    formData.ventanaMarco,
    formData.ventanaAreaPiso1,
    formData.ventanaAreaPiso2,
    formData.sistemaCalefaccion,
    formData.consumoAnual,
    formData.solucionMejoraMuroPiso1,
    formData.solucionMejoraMuroPiso2,
    formData.solucionMejoraTecho,
    formData.solucionMejoraVentana,
    superficies.superficie_1,
    superficies.superficie_2
  ]);

  // FUNCIÓN CORREGIDA: Procesar aislantes
  const procesarAislantes = (aislantes, tipoMaterial = 'muro') => {
    console.log(`🔧 Procesando aislantes para ${tipoMaterial}:`, aislantes);
    
    const tiposUnicos = new Set();
    const aislantesAgrupados = {};
    const espesoresPorTipo = new Set();

    aislantes.forEach(aislante => {
      const elemento = aislante.elemento;
      
      let tipo = '';
      let espesor = null;

      // Detectar "Sin aislante"
      if (elemento.toLowerCase().includes('sin aislante')) {
        tipo = 'Sin aislante';
      } else {
        // Extraer espesor (número seguido de mm)
        const espesorMatch = elemento.match(/(\d+)\s*mm/);
        if (espesorMatch) {
          espesor = `${espesorMatch[1]}mm`;
          // El tipo es todo lo que no es el espesor
          tipo = elemento.replace(espesor, '').replace(/\s+/g, ' ').trim();
          // Limpiar caracteres sobrantes
          tipo = tipo.replace(/\s*-\s*$/, '').replace(/\s*,\s*$/, '').trim();
        } else {
          tipo = elemento;
        }
      }

      // Si el tipo está vacío, usar el elemento completo
      if (!tipo || tipo === '') {
        tipo = elemento;
      }

      // Agregar a tipos únicos
      tiposUnicos.add(tipo);

      // Agrupar por tipo
      if (!aislantesAgrupados[tipo]) {
        aislantesAgrupados[tipo] = [];
      }

      // Para evitar duplicados de espesores, usar una clave única
      const claveEspesor = espesor || 'sin-espesor';
      
      if (!espesoresPorTipo.has(`${tipo}-${claveEspesor}`)) {
        espesoresPorTipo.add(`${tipo}-${claveEspesor}`);
        aislantesAgrupados[tipo].push({
          id: aislante.id,
          elemento: aislante.elemento,
          espesor: espesor,
          valor: aislante.valor,
          porcentaje: aislante.porcentaje
        });
      }
    });

    // Ordenar espesores de menor a mayor para tipos que tienen espesores
    Object.keys(aislantesAgrupados).forEach(tipo => {
      if (tipo !== 'Sin aislante' && aislantesAgrupados[tipo].some(item => item.espesor)) {
        aislantesAgrupados[tipo].sort((a, b) => {
          const espesorA = parseInt(a.espesor) || 0;
          const espesorB = parseInt(b.espesor) || 0;
          return espesorA - espesorB;
        });
      }
    });

    return {
      tipos: Array.from(tiposUnicos),
      agrupados: aislantesAgrupados
    };
  };

  // FUNCIÓN CORREGIDA: Procesar ventanas
  const procesarVentanas = (ventanas) => {
    const tiposUnicos = new Set();
    const marcosPorTipo = {};

    ventanas.forEach(ventana => {
      const elemento = ventana.elemento;
      
      // Separar el tipo de ventana y el marco usando " y marco "
      const partes = elemento.split(' y marco ');
      let tipo = '';
      let marco = '';

      if (partes.length === 2) {
        tipo = partes[0].trim();
        marco = partes[1].trim();
      } else {
        tipo = elemento;
        marco = 'Especial';
      }

      // Agregar a tipos únicos
      tiposUnicos.add(tipo);

      // Agrupar marcos por tipo
      if (!marcosPorTipo[tipo]) {
        marcosPorTipo[tipo] = [];
      }

      // Evitar duplicados de marcos
      if (!marcosPorTipo[tipo].some(m => m.marco === marco)) {
        marcosPorTipo[tipo].push({
          id: ventana.id,
          marco: marco,
          elemento: ventana.elemento,
          valor: ventana.valor
        });
      }
    });

    return {
      tipos: Array.from(tiposUnicos),
      marcosPorTipo: marcosPorTipo
    };
  };

  // Cargar materiales desde la base de datos
  useEffect(() => {
    const cargarMaterialesDesdeBD = async () => {
      try {
        console.log('🔍 Cargando materiales desde la base de datos...');
        setCargandoMateriales(true);

        const endpoints = [
          'http://localhost:5000/api/materiales/muros',
          'http://localhost:5000/api/materiales/aislantes-muro',
          'http://localhost:5000/api/materiales/techos',
          'http://localhost:5000/api/materiales/aislantes-techo',
          'http://localhost:5000/api/materiales/ventanas',
          'http://localhost:5000/api/materiales/sistemas-calefaccion',
        ];

        const responses = await Promise.all(
          endpoints.map(url => fetch(url).then(res => {
            if (!res.ok) throw new Error(`Error en ${url}: ${res.status}`);
            return res.json();
          }))
        );

        const [
          murosResult,
          aislantesMuroResult,
          techosResult,
          aislantesTechoResult,
          ventanasResult,
          sistemasResult,
        ] = responses;

        // Procesar aislantes de muro
        const aislantesMuroProcesados = procesarAislantes(aislantesMuroResult.data || [], 'muro');

        // Procesar aislantes de techo
        const aislantesTechoProcesados = procesarAislantes(aislantesTechoResult.data || [], 'techo');

        // Procesar ventanas
        const ventanasProcesadas = procesarVentanas(ventanasResult.data || []);

        setMateriales(prev => ({
          ...prev,
          muros: Array.isArray(murosResult.data) ? murosResult.data : [],
          aislantesMuroAgrupados: aislantesMuroProcesados.agrupados,
          aislantesMuroCompletos: Array.isArray(aislantesMuroResult.data) ? aislantesMuroResult.data : [],
          techos: Array.isArray(techosResult.data) ? techosResult.data : [],
          aislantesTechoAgrupados: aislantesTechoProcesados.agrupados,
          aislantesTechoCompletos: Array.isArray(aislantesTechoResult.data) ? aislantesTechoResult.data : [],
          ventanasTipos: ventanasProcesadas.tipos,
          ventanasMarcos: ventanasProcesadas.marcosPorTipo,
          ventanasCompletas: Array.isArray(ventanasResult.data) ? ventanasResult.data : [],
          sistemasCalefaccion: Array.isArray(sistemasResult.data) ? sistemasResult.data : [],
          preciosUnitarios: []
        }));

      } catch (error) {
        console.error('❌ Error cargando materiales desde BD:', error);
        setErrorCarga(`Error cargando materiales: ${error.message}`);
        
        setMateriales({
          muros: [],
          aislantesMuroAgrupados: {},
          aislantesMuroCompletos: [],
          techos: [],
          aislantesTechoAgrupados: {},
          aislantesTechoCompletos: [],
          ventanasTipos: [],
          ventanasMarcos: {},
          ventanasCompletas: [],
          sistemasCalefaccion: [],
          solucionesMuro: [],
          solucionesTecho: [],
          solucionesVentana: [],
          preciosUnitarios: []
        });
      } finally {
        setCargandoMateriales(false);
      }
    };

    cargarMaterialesDesdeBD();
  }, []);

  // Cargar soluciones de mejora desde la BD
  const cargarSolucionesMejora = async () => {
    try {
      setCargandoSoluciones(true);
      console.log('🔍 Cargando soluciones de mejora...');

      const endpoints = [
        'http://localhost:5000/api/soluciones/muro',
        'http://localhost:5000/api/soluciones/techo',
        'http://localhost:5000/api/soluciones/ventana'
      ];

      const responses = await Promise.all(
        endpoints.map(url => fetch(url).then(res => {
          if (!res.ok) throw new Error(`Error en ${url}: ${res.status}`);
          return res.json();
        }))
      );

      const [solucionesMuroResult, solucionesTechoResult, solucionesVentanaResult] = responses;

      setMateriales(prev => ({
        ...prev,
        solucionesMuro: Array.isArray(solucionesMuroResult.data) ? solucionesMuroResult.data : [],
        solucionesTecho: Array.isArray(solucionesTechoResult.data) ? solucionesTechoResult.data : [],
        solucionesVentana: Array.isArray(solucionesVentanaResult.data) ? solucionesVentanaResult.data : []
      }));

    } catch (error) {
      console.error('❌ Error cargando soluciones de mejora:', error);
      setMateriales(prev => ({
        ...prev,
        solucionesMuro: [],
        solucionesTecho: [],
        solucionesVentana: []
      }));
    } finally {
      setCargandoSoluciones(false);
    }
  };

  // Llamar a cargarSolucionesMejora después de cargar los materiales básicos
  useEffect(() => {
    if (!cargandoMateriales) {
      cargarSolucionesMejora();
    }
  }, [cargandoMateriales]);

  // FUNCIONES PARA OBTENER SOLUCIONES FILTRADAS
  const getSolucionesMuroPiso1 = () => {
    if (!formData.muroAislacionTipoPiso1) return [];

    // Buscar el aislante seleccionado
    const aislanteEncontrado = materiales.aislantesMuroCompletos.find(aislante => {
      const elemento = aislante.elemento.toLowerCase();
      const tipoBuscado = formData.muroAislacionTipoPiso1.toLowerCase();
      const espesorBuscado = formData.muroAislacionEspesorPiso1 ? formData.muroAislacionEspesorPiso1.toLowerCase() : '';
      
      return elemento.includes(tipoBuscado) && 
             (!formData.muroAislacionEspesorPiso1 || elemento.includes(espesorBuscado));
    });

    if (!aislanteEncontrado) return [];

    // Filtrar soluciones para este aislante
    return materiales.solucionesMuro.filter(solucion => 
      solucion.id_aislante_muro === aislanteEncontrado.id
    );
  };

  const getSolucionesMuroPiso2 = () => {
    if (!formData.muroAislacionTipoPiso2) return [];

    const aislanteEncontrado = materiales.aislantesMuroCompletos.find(aislante => {
      const elemento = aislante.elemento.toLowerCase();
      const tipoBuscado = formData.muroAislacionTipoPiso2.toLowerCase();
      const espesorBuscado = formData.muroAislacionEspesorPiso2 ? formData.muroAislacionEspesorPiso2.toLowerCase() : '';
      
      return elemento.includes(tipoBuscado) && 
             (!formData.muroAislacionEspesorPiso2 || elemento.includes(espesorBuscado));
    });

    if (!aislanteEncontrado) return [];

    return materiales.solucionesMuro.filter(solucion => 
      solucion.id_aislante_muro === aislanteEncontrado.id
    );
  };

  const getSolucionesTecho = () => {
    if (!formData.techoAislacionTipo) return [];

    const aislanteEncontrado = materiales.aislantesTechoCompletos.find(aislante => {
      const elemento = aislante.elemento.toLowerCase();
      const tipoBuscado = formData.techoAislacionTipo.toLowerCase();
      const espesorBuscado = formData.techoAislacionEspesor ? formData.techoAislacionEspesor.toLowerCase() : '';
      
      return elemento.includes(tipoBuscado) && 
             (!formData.techoAislacionEspesor || elemento.includes(espesorBuscado));
    });

    if (!aislanteEncontrado) return [];

    return materiales.solucionesTecho.filter(solucion => 
      solucion.id_aislante_techo === aislanteEncontrado.id
    );
  };

  // CORREGIR: Función para obtener soluciones de ventana
  const getSolucionesVentana = () => {
    if (!formData.ventanaTipo || !formData.ventanaMarco) return [];

    const ventanaEncontrada = materiales.ventanasCompletas.find(ventana => {
      const elemento = ventana.elemento.toLowerCase();
      const tipoBuscado = formData.ventanaTipo.toLowerCase();
      const marcoBuscado = formData.ventanaMarco.toLowerCase();
      
      return elemento.includes(tipoBuscado) && elemento.includes(marcoBuscado);
    });

    if (!ventanaEncontrada) return [];

    return materiales.solucionesVentana.filter(solucion => 
      solucion.id_ventana === ventanaEncontrada.id
    );
  };

  // FUNCIÓN PARA OBTENER ELEMENTO DE VENTANA
  const getElementoVentana = (idVentana) => {
    const ventana = materiales.ventanasCompletas.find(v => v.id === idVentana);
    return ventana ? ventana.elemento : `Ventana ID: ${idVentana}`;
  };

  // MANEJADORES DE CAMBIOS
  const handleSuperficieChange = (campo, valor) => {
    const nuevoValor = valor === '' ? '' : parseFloat(valor) || 0;
    
    // Limpiar error cuando el usuario empiece a escribir
    if (errores[campo]) {
      setErrores(prev => ({ ...prev, [campo]: '' }));
    }
    
    setSuperficies(prev => ({
      ...prev,
      [campo]: nuevoValor
    }));

    if (campo === 'superficie_2' && (valor === '' || parseFloat(valor) === 0)) {
      setFormData(prev => ({
        ...prev,
        ventanaAreaPiso2: '',
        muroEstructuraPiso2: '',
        muroAislacionTipoPiso2: '',
        muroAislacionEspesorPiso2: '',
        solucionMejoraMuroPiso2: ''
      }));
    }
  };

  const handleAislacionTipoChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor,
      [`${campo.replace('Tipo', 'Espesor')}`]: ''
    }));
  };

  const handleVentanaTipoChange = (valor) => {
    setFormData(prev => ({
      ...prev,
      ventanaTipo: valor,
      ventanaMarco: ''
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Limpiar error cuando el usuario empiece a escribir
    if (errores[name]) {
      setErrores(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name === 'ventanaAreaPiso1' || name === 'ventanaAreaPiso2') {
      const numValue = parseFloat(value);
      if (value === '' || (numValue >= 0 && numValue <= 90)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // OBTENER ESPESORES DISPONIBLES
  const getEspesoresDisponibles = (tipoAislante, esParaMuro = true) => {
    if (!tipoAislante) return [];
    
    const aislantesAgrupados = esParaMuro 
      ? materiales.aislantesMuroAgrupados 
      : materiales.aislantesTechoAgrupados;
    
    return aislantesAgrupados[tipoAislante] || [];
  };

  // OBTENER MARCOS DISPONIBLES
  const getMarcosDisponibles = (tipoVentana) => {
    if (!tipoVentana) return [];
    return materiales.ventanasMarcos[tipoVentana] || [];
  };

  // GUARDAR SUPERFICIES
  const guardarSuperficies = async () => {
    if (!superficies.superficie_1 || superficies.superficie_1 <= 0) {
      showError('La superficie del primer piso debe ser mayor a 0');
      return;
    }

    setCargandoSuperficies(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('No estás autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }

      const response = await fetch('http://localhost:5000/api/vivienda/actualizar-superficies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          superficie_1: superficies.superficie_1,
          superficie_2: superficies.superficie_2 || 0
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setEditandoSuperficies(false);
        showSuccess('Superficies actualizadas exitosamente');
      } else {
        throw new Error(result.error || 'Error desconocido al actualizar');
      }
    } catch (error) {
      console.error('❌ Error guardando superficies:', error);
      showError(`Error al guardar: ${error.message}`);
    } finally {
      setCargandoSuperficies(false);
    }
  };

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
          setSuperficies({
            superficie_1: result.vivienda.superficie_1 || '',
            superficie_2: result.vivienda.superficie_2 || ''
          });
        }
      }
    } catch (error) {
      console.error('Error recargando datos:', error);
    }
  };

  const handleCancelarEdicion = async () => {
    await recargarDatosVivienda();
    setEditandoSuperficies(false);
    showInfo('Edición cancelada', 'Se restauraron los valores originales');
  };

  // FUNCIÓN PARA VALIDAR FORMULARIO
  const validarFormulario = () => {
    const nuevosErrores = {};

    // Validar campos obligatorios
    if (!superficies.superficie_1 || superficies.superficie_1 <= 0) {
      nuevosErrores.superficie_1 = 'La superficie del primer piso es obligatoria';
    }

    if (!formData.consumoAnual || formData.consumoAnual <= 0) {
      nuevosErrores.consumoAnual = 'El consumo anual es obligatorio';
    }

    if (!formData.sistemaCalefaccion) {
      nuevosErrores.sistemaCalefaccion = 'Debe seleccionar un sistema de calefacción';
    }

    if (!formData.muroEstructuraPiso1) {
      nuevosErrores.muroEstructuraPiso1 = 'La estructura del muro del primer piso es obligatoria';
    }

    if (!formData.techoEstructura) {
      nuevosErrores.techoEstructura = 'La estructura del techo es obligatoria';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // FUNCIÓN CORREGIDA: Guardar evaluación
  const guardarEvaluacion = async () => {
    // Validar formulario antes de guardar
    if (!validarFormulario()) {
      showError('Por favor, completa todos los campos obligatorios correctamente');
      return;
    }

    setGuardando(true);
    try {
      // Obtener IDs de las soluciones
      const idsSoluciones = getIdsSoluciones();
      
      // Obtener ID del combustible
      const id_combustible = getIdCombustible(formData.sistemaCalefaccion);
      
      if (!id_combustible) {
        showError('Error: No se pudo identificar el sistema de calefacción seleccionado');
        return;
      }

      console.log('💾 Preparando datos para guardar evaluación:', {
        superficie_1: superficies.superficie_1,
        superficie_2: superficies.superficie_2,
        areaVentana1: formData.ventanaAreaPiso1,
        areaVentana2: formData.ventanaAreaPiso2,
        id_combustible,
        consumoAnual: formData.consumoAnual,
        ...idsSoluciones,
        eficiencia: resultados.eficiencia,
        inversion: resultados.inversion,
        ahorroAnual: resultados.ahorroAnual,
        payback: resultados.payback,
        reduccionCo2: resultados.reduccionCO2
      });

      const token = localStorage.getItem('token');
      if (!token) {
        showError('No estás autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }

      const response = await fetch('http://localhost:5000/api/evaluaciones/guardar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          superficie_1: parseFloat(superficies.superficie_1),
          superficie_2: parseFloat(superficies.superficie_2) || 0,
          areaVentana1: parseFloat(formData.ventanaAreaPiso1) || 0,
          areaVentana2: parseFloat(formData.ventanaAreaPiso2) || 0,
          id_combustible: id_combustible,
          consumoAnual: parseFloat(formData.consumoAnual),
          id_solucion_muro1: idsSoluciones.id_solucion_muro1,
          id_solucion_muro2: idsSoluciones.id_solucion_muro2,
          id_solucion_techo: idsSoluciones.id_solucion_techo,
          id_solucion_ventana: idsSoluciones.id_solucion_ventana,
          eficiencia: parseFloat(resultados.eficiencia) || 0,
          inversion: parseFloat(resultados.inversion) || 0,
          ahorroAnual: parseFloat(resultados.ahorroAnual) || 0,
          payback: parseFloat(resultados.payback) || 0,
          reduccionCo2: parseFloat(resultados.reduccionCO2) || 0
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar la evaluación');
      }

      if (result.success) {
        setGuardadoExitoso(true);
        showSuccess('Evaluación guardada exitosamente');
        console.log('📊 Evaluación guardada con ID:', result.data.id);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('❌ Error guardando evaluación:', error);
      showError(`Error al guardar evaluación: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  // FUNCIÓN PARA MANEJAR NUEVA EVALUACIÓN
  const handleNuevaEvaluacion = () => {
    setGuardadoExitoso(false);
    // Resetear el formulario
    setFormData({
      muroEstructuraPiso1: '',
      muroAislacionTipoPiso1: '',
      muroAislacionEspesorPiso1: '',
      muroEstructuraPiso2: '',
      muroAislacionTipoPiso2: '',
      muroAislacionEspesorPiso2: '',
      techoEstructura: '',
      techoAislacionTipo: '',
      techoAislacionEspesor: '',
      ventanaTipo: '',
      ventanaMarco: '',
      ventanaAreaPiso1: '',
      ventanaAreaPiso2: '',
      sistemaCalefaccion: '',
      consumoAnual: '',
      solucionMejoraMuroPiso1: '',
      solucionMejoraMuroPiso2: '',
      solucionMejoraTecho: '',
      solucionMejoraVentana: ''
    });
    setResultados({
      eficiencia: 0,
      inversion: 0,
      ahorroAnual: 0,
      payback: 0,
      reduccionCO2: 0
    });
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
          <h1 className="form-title">Evaluación de Calefacción</h1>
        </div>

        {guardadoExitoso ? (
          <div className="mensaje-exito valoracion-exito">
            <div className="icono-exito">✓</div>
            <h2 className="exito-titulo">¡Evaluación Guardada Exitosamente!</h2>
            <p className="exito-mensaje">
              Tu evaluación de calefacción ha sido guardada correctamente. 
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
            {/* SECCIÓN: INFORMACIÓN BÁSICA */}
            <div className="form-section">
              <h2>Información Básica</h2>
              
              {errorCarga && (
                <div className="error-message">
                  <strong>⚠️ Error:</strong> {errorCarga}
                  <br />
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn-reintentar"
                  >
                    Reintentar carga
                  </button>
                </div>
              )}
              
              <div className="input-group">
                <div className="edicion-personas-container">
                  <label className="input-label">
                    Superficies de la vivienda (m²)
                    {cargandoDatos && <span className="estado-carga">(Cargando...)</span>}
                  </label>
                  {!editandoSuperficies ? (
                    <button 
                      type="button"
                      onClick={() => setEditandoSuperficies(true)}
                      className="btn-editar"
                      disabled={cargandoDatos || !!errorCarga}
                    >
                      ✏️ Editar
                    </button>
                  ) : (
                    <div className="botones-edicion">
                      <button 
                        type="button"
                        onClick={guardarSuperficies}
                        disabled={cargandoSuperficies || !superficies.superficie_1 || superficies.superficie_1 <= 0}
                        className="btn-guardar"
                      >
                        {cargandoSuperficies ? '💾 Guardando...' : '💾 Guardar'}
                      </button>
                      <button 
                        type="button"
                        onClick={handleCancelarEdicion}
                        disabled={cargandoSuperficies}
                        className="btn-cancelar"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  )}
                </div>
                
                {editandoSuperficies ? (
                  <div className="superficie-container">
                    <div className="input-group">
                      <label className="input-label">Primer piso (m²) *</label>
                      <input
                        type="number"
                        value={superficies.superficie_1}
                        onChange={(e) => handleSuperficieChange('superficie_1', e.target.value)}
                        min="1"
                        step="0.1"
                        placeholder="Ej: 60"
                        disabled={cargandoSuperficies}
                        className={errores.superficie_1 ? 'error-input' : ''}
                        required
                      />
                      {errores.superficie_1 && (
                        <div className="error-mensaje-campo">{errores.superficie_1}</div>
                      )}
                    </div>
                    <div className="input-group">
                      <label className="input-label">Segundo piso (m²)</label>
                      <input
                        type="number"
                        value={superficies.superficie_2}
                        onChange={(e) => handleSuperficieChange('superficie_2', e.target.value)}
                        min="0"
                        step="0.1"
                        placeholder="Ej: 40"
                        disabled={cargandoSuperficies}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="info-display">
                    {cargandoDatos ? 'Cargando...' : (
                      <>
                        <div>Primer piso: {superficies.superficie_1} m²</div>
                        {superficies.superficie_2 && parseFloat(superficies.superficie_2) > 0 ? (
                          <div>Segundo piso: {superficies.superficie_2} m²</div>
                        ) : (
                          <div className="info-small">
                            No posee segundo piso
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN: MATERIALES DE CONSTRUCCIÓN - AHORA SEPARADO POR PISO */}
            <div className="form-section">
              <h2>Materiales de construcción</h2>
              
              {cargandoMateriales && (
                <div className="cargando">
                  Cargando materiales...
                </div>
              )}

              {/* MURO - PRIMER PISO */}
              <div className="sub-section">
                <h3>Primer Piso - Muro</h3>
                
                <div className="input-group">
                  <label className="input-label">Estructura *</label>
                  <select
                    name="muroEstructuraPiso1"
                    value={formData.muroEstructuraPiso1}
                    onChange={handleChange}
                    required
                    disabled={cargandoMateriales}
                    className={errores.muroEstructuraPiso1 ? 'error-input' : ''}
                  >
                    <option value="">Seleccione estructura de muro</option>
                    {materiales.muros.map(muro => (
                      <option key={`p1-${muro.id}`} value={muro.elemento}>
                        {muro.elemento}
                      </option>
                    ))}
                  </select>
                  {errores.muroEstructuraPiso1 && (
                    <div className="error-mensaje-campo">{errores.muroEstructuraPiso1}</div>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Tipo de Aislación</label>
                  <select
                    name="muroAislacionTipoPiso1"
                    value={formData.muroAislacionTipoPiso1}
                    onChange={(e) => handleAislacionTipoChange('muroAislacionTipoPiso1', e.target.value)}
                    disabled={cargandoMateriales}
                  >
                    <option value="">Seleccione tipo de aislación</option>
                    {Object.keys(materiales.aislantesMuroAgrupados).map(tipo => (
                      <option key={`p1-tipo-${tipo}`} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.muroAislacionTipoPiso1 && formData.muroAislacionTipoPiso1 !== 'Sin aislante' && (
                  <div className="input-group">
                    <label className="input-label">Espesor de Aislación</label>
                    <select
                      name="muroAislacionEspesorPiso1"
                      value={formData.muroAislacionEspesorPiso1}
                      onChange={handleChange}
                      disabled={cargandoMateriales}
                    >
                      <option value="">Seleccione espesor</option>
                      {getEspesoresDisponibles(formData.muroAislacionTipoPiso1, true).map(aislante => (
                        <option key={`p1-espesor-${aislante.id}`} value={aislante.espesor}>
                          {aislante.espesor}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* MURO - SEGUNDO PISO (SOLO SI HAY SUPERFICIE) */}
              {superficies.superficie_2 && parseFloat(superficies.superficie_2) > 0 && (
                <div className="sub-section">
                  <h3>Segundo Piso - Muro</h3>
                  
                  <div className="input-group">
                    <label className="input-label">Estructura</label>
                    <select
                      name="muroEstructuraPiso2"
                      value={formData.muroEstructuraPiso2}
                      onChange={handleChange}
                      disabled={cargandoMateriales}
                    >
                      <option value="">Seleccione estructura de muro</option>
                      {materiales.muros.map(muro => (
                        <option key={`p2-${muro.id}`} value={muro.elemento}>
                          {muro.elemento}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Tipo de Aislación</label>
                    <select
                      name="muroAislacionTipoPiso2"
                      value={formData.muroAislacionTipoPiso2}
                      onChange={(e) => handleAislacionTipoChange('muroAislacionTipoPiso2', e.target.value)}
                      disabled={cargandoMateriales}
                    >
                      <option value="">Seleccione tipo de aislación</option>
                      {Object.keys(materiales.aislantesMuroAgrupados).map(tipo => (
                        <option key={`p2-tipo-${tipo}`} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.muroAislacionTipoPiso2 && formData.muroAislacionTipoPiso2 !== 'Sin aislante' && (
                    <div className="input-group">
                      <label className="input-label">Espesor de Aislación</label>
                      <select
                        name="muroAislacionEspesorPiso2"
                        value={formData.muroAislacionEspesorPiso2}
                        onChange={handleChange}
                        disabled={cargandoMateriales}
                      >
                        <option value="">Seleccione espesor</option>
                        {getEspesoresDisponibles(formData.muroAislacionTipoPiso2, true).map(aislante => (
                          <option key={`p2-espesor-${aislante.id}`} value={aislante.espesor}>
                            {aislante.espesor}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* TECHO */}
              <div className="sub-section">
                <h3>Techo</h3>
                
                <div className="input-group">
                  <label className="input-label">Estructura *</label>
                  <select
                    name="techoEstructura"
                    value={formData.techoEstructura}
                    onChange={handleChange}
                    required
                    disabled={cargandoMateriales}
                    className={errores.techoEstructura ? 'error-input' : ''}
                  >
                    <option value="">Seleccione estructura de techo</option>
                    {materiales.techos.map(techo => (
                      <option key={techo.id} value={techo.elemento}>
                        {techo.elemento}
                      </option>
                    ))}
                  </select>
                  {errores.techoEstructura && (
                    <div className="error-mensaje-campo">{errores.techoEstructura}</div>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Tipo de Aislación</label>
                  <select
                    name="techoAislacionTipo"
                    value={formData.techoAislacionTipo}
                    onChange={(e) => handleAislacionTipoChange('techoAislacionTipo', e.target.value)}
                    disabled={cargandoMateriales}
                  >
                    <option value="">Seleccione tipo de aislación</option>
                    {Object.keys(materiales.aislantesTechoAgrupados).map(tipo => (
                      <option key={`techo-tipo-${tipo}`} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.techoAislacionTipo && formData.techoAislacionTipo !== 'Sin aislante' && (
                  <div className="input-group">
                    <label className="input-label">Espesor de Aislación</label>
                    <select
                      name="techoAislacionEspesor"
                      value={formData.techoAislacionEspesor}
                      onChange={handleChange}
                      disabled={cargandoMateriales}
                    >
                      <option value="">Seleccione espesor</option>
                      {getEspesoresDisponibles(formData.techoAislacionTipo, false).map(aislante => (
                        <option key={`techo-espesor-${aislante.id}`} value={aislante.espesor}>
                          {aislante.espesor}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* VENTANAS */}
              <div className="sub-section">
                <h3>Ventanas</h3>
                
                <div className="input-group">
                  <label className="input-label">Tipo</label>
                  <select
                    name="ventanaTipo"
                    value={formData.ventanaTipo}
                    onChange={(e) => handleVentanaTipoChange(e.target.value)}
                    disabled={cargandoMateriales}
                  >
                    <option value="">Seleccione tipo de ventana</option>
                    {materiales.ventanasTipos.map(tipo => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.ventanaTipo && (
                  <div className="input-group">
                    <label className="input-label">Marco</label>
                    <select
                      name="ventanaMarco"
                      value={formData.ventanaMarco}
                      onChange={handleChange}
                      disabled={cargandoMateriales}
                    >
                      <option value="">Seleccione tipo de marco</option>
                      {getMarcosDisponibles(formData.ventanaTipo).map(marco => (
                        <option key={marco.id} value={marco.marco}>
                          {marco.marco}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Área de ventana - Primer piso (% con respecto a muros)</label>
                  <input
                    type="number"
                    name="ventanaAreaPiso1"
                    min="0"
                    max="90"
                    step="1"
                    placeholder="Ej: 25"
                    value={formData.ventanaAreaPiso1}
                    onChange={handleChange}
                  />
                </div>

                {superficies.superficie_2 && parseFloat(superficies.superficie_2) > 0 ? (
                  <div className="input-group">
                    <label className="input-label">Área de ventana - Segundo piso (% con respecto a muros)</label>
                    <input
                      type="number"
                      name="ventanaAreaPiso2"
                      min="0"
                      max="90"
                      step="1"
                      placeholder="Ej: 20"
                      value={formData.ventanaAreaPiso2}
                      onChange={handleChange}
                    />
                  </div>
                ) : (
                  <div className="input-group">
                    <label className="input-label">
                      Área de ventana - Segundo piso (% con respecto a muros)
                    </label>
                    <input
                      type="number"
                      disabled
                      placeholder="No aplica - No hay segundo piso"
                      className="info-display"
                      value=""
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN: SISTEMA DE CALEFACCIÓN */}
            <div className="form-section">
              <h2>Sistema de calefacción</h2>
              
              <div className="input-group">
                <label className="input-label">Sistema de calefacción *</label>
                <select
                  name="sistemaCalefaccion"
                  value={formData.sistemaCalefaccion}
                  onChange={handleChange}
                  required
                  disabled={cargandoMateriales}
                  className={errores.sistemaCalefaccion ? 'error-input' : ''}
                >
                  <option value="">Seleccione sistema de calefacción</option>
                  {materiales.sistemasCalefaccion.map(sistema => (
                    <option key={sistema.id} value={sistema.nombre}>
                      {sistema.nombre}
                    </option>
                  ))}
                </select>
                {errores.sistemaCalefaccion && (
                  <div className="error-mensaje-campo">{errores.sistemaCalefaccion}</div>
                )}
              </div>

              <div className="input-group">
                <label className="input-label">Consumo anual aproximado ($) *</label>
                <input
                  type="number"
                  name="consumoAnual"
                  min="0"
                  step="1000"
                  placeholder="Ej: 300000"
                  required
                  value={formData.consumoAnual}
                  onChange={handleChange}
                  className={errores.consumoAnual ? 'error-input' : ''}
                />
                {errores.consumoAnual && (
                  <div className="error-mensaje-campo">{errores.consumoAnual}</div>
                )}
              </div>
            </div>

            {/* SECCIÓN: SOLUCIONES DE MEJORA */}
            <div className="form-section">
              <h2>Selecciona Solución de Mejora</h2>
              
              {cargandoSoluciones && (
                <div className="cargando">
                  Cargando soluciones de mejora...
                </div>
              )}

              {/* SOLUCIÓN DE MEJORA - MURO PRIMER PISO */}
              <div className="sub-section">
                <h3>Primer Piso - Solución de Mejora Muro</h3>
                <div className="input-group">
                  <select
                    name="solucionMejoraMuroPiso1"
                    value={formData.solucionMejoraMuroPiso1}
                    onChange={handleChange}
                    disabled={cargandoSoluciones || !formData.muroAislacionTipoPiso1}
                  >
                    <option value="">Seleccione solución de mejora para muro</option>
                    {getSolucionesMuroPiso1().map(solucion => (
                      <option key={`p1-sol-${solucion.id}`} value={solucion.solucion}>
                        {solucion.solucion} (R: {solucion.r_solucion})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SOLUCIÓN DE MEJORA - MURO SEGUNDO PISO */}
              {superficies.superficie_2 && parseFloat(superficies.superficie_2) > 0 && (
                <div className="sub-section">
                  <h3>Segundo Piso - Solución de Mejora Muro</h3>
                  <div className="input-group">
                    <select
                      name="solucionMejoraMuroPiso2"
                      value={formData.solucionMejoraMuroPiso2}
                      onChange={handleChange}
                      disabled={cargandoSoluciones || !formData.muroAislacionTipoPiso2}
                    >
                      <option value="">Seleccione solución de mejora para muro</option>
                      {getSolucionesMuroPiso2().map(solucion => (
                        <option key={`p2-sol-${solucion.id}`} value={solucion.solucion}>
                          {solucion.solucion} (R: {solucion.r_solucion})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* SOLUCIÓN DE MEJORA - TECHO */}
              <div className="sub-section">
                <h3>Solución de Mejora - Techo</h3>
                <div className="input-group">
                  <select
                    name="solucionMejoraTecho"
                    value={formData.solucionMejoraTecho}
                    onChange={handleChange}
                    disabled={cargandoSoluciones || !formData.techoAislacionTipo}
                  >
                    <option value="">Seleccione solución de mejora para techo</option>
                    {getSolucionesTecho().map(solucion => (
                      <option key={`techo-sol-${solucion.id}`} value={solucion.solucion}>
                        {solucion.solucion} (R: {solucion.r_solucion})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SOLUCIÓN DE MEJORA - VENTANA */}
              <div className="sub-section">
                <h3>Solución de Mejora - Ventana</h3>
                <div className="input-group">
                  <select
                    name="solucionMejoraVentana"
                    value={formData.solucionMejoraVentana}
                    onChange={handleChange}
                    disabled={cargandoSoluciones || !formData.ventanaTipo || !formData.ventanaMarco}
                  >
                    <option value="">Seleccione solución de mejora para ventana</option>
                    {getSolucionesVentana().map(solucion => (
                      <option key={`ventana-sol-${solucion.id}`} value={solucion.id}>
                        {getElementoVentana(solucion.id_ventana_solucion)} (U: {solucion.utotal})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN DEBUG */}
            <div className="form-section debug-section">
              <h3>🔍 INFORMACIÓN DETALLADA DE DEBUG</h3>
              
              <div className="debug-content">
                
                {/* VALORES R/U */}
                <div className="debug-section-item">
                  <strong>🏗️ VALORES R/U:</strong>
                  <div>Estructura Muro P1: {debugDetallado.valoresR.estructura_muro_p1 || '--'}</div>
                  <div>Aislante Muro P1: {debugDetallado.valoresR.aislante_muro_p1 || '--'}</div>
                  <div>R Solución Muro P1: {debugDetallado.valoresR.r_solucion_muro || '--'}</div>
                  <div>Estructura Muro P2: {debugDetallado.valoresR.estructura_muro_p2 || '--'}</div>
                  <div>Aislante Muro P2: {debugDetallado.valoresR.aislante_muro_p2 || '--'}</div>
                  <div>R Solución Muro P2: {debugDetallado.valoresR.r_solucion_muro2 || '--'}</div>
                  <div>Estructura Techo: {debugDetallado.valoresR.estructura_techo || '--'}</div>
                  <div>Aislante Techo: {debugDetallado.valoresR.aislante_techo || '--'}</div>
                  <div>U Ventana: {debugDetallado.valoresR.u_ventana || '--'}</div>
                </div>

                {/* COEFICIENTES U */}
                <div className="debug-section-item">
                  <strong>📊 COEFICIENTES U:</strong>
                  <div>um1: {debugDetallado.coeficientesU.um1?.toFixed(4) || '--'}</div>
                  <div>um2: {debugDetallado.coeficientesU.um2?.toFixed(4) || '--'}</div>
                  <div>uv: {debugDetallado.coeficientesU.uv?.toFixed(4) || '--'}</div>
                  <div>ut: {debugDetallado.coeficientesU.ut?.toFixed(4) || '--'}</div>
                  <div>um1n: {debugDetallado.coeficientesU.um1n?.toFixed(4) || '--'}</div>
                  <div><strong>um2n (CORREGIDO): {debugDetallado.coeficientesU.um2n?.toFixed(4) || '--'}</strong></div>
                </div>

                {/* PÉRDIDAS DE CALOR */}
                <div className="debug-section-item">
                  <strong>🔥 PÉRDIDAS DE CALOR:</strong>
                  <div>hm1: {debugDetallado.perdidasCalor.hm1?.toFixed(2) || '--'}</div>
                  <div>hm2: {debugDetallado.perdidasCalor.hm2?.toFixed(2) || '--'}</div>
                  <div>hv1: {debugDetallado.perdidasCalor.hv1?.toFixed(2) || '--'}</div>
                  <div>hv2: {debugDetallado.perdidasCalor.hv2?.toFixed(2) || '--'}</div>
                  <div>ht: {debugDetallado.perdidasCalor.ht?.toFixed(2) || '--'}</div>
                  <div>hv: {debugDetallado.perdidasCalor.hv?.toFixed(2) || '--'}</div>
                  <div><strong>HT: {debugDetallado.perdidasCalor.HT?.toFixed(2) || '--'}</strong></div>
                  <div>hm1n: {debugDetallado.perdidasCalor.hm1n?.toFixed(2) || '--'}</div>
                  <div>hm2n: {debugDetallado.perdidasCalor.hm2n?.toFixed(2) || '--'}</div>
                  <div>hvn1: {debugDetallado.perdidasCalor.hvn1?.toFixed(2) || '--'}</div>
                  <div><strong>HTn: {debugDetallado.perdidasCalor.Htn?.toFixed(2) || '--'}</strong></div>
                </div>

                {/* PRECIOS */}
                <div className="debug-section-item">
                  <strong>💵 PRECIOS:</strong>
                  <div>Precio por kW: {debugDetallado.precios.precioKW?.toFixed(2) || '--'}</div>
                  <div>Precio Muro P1: ${debugDetallado.precios.precio_muro_p1 || '--'}</div>
                  <div>Precio Muro P2: ${debugDetallado.precios.precio_muro_p2 || '--'}</div>
                  <div>Precio Techo: ${debugDetallado.precios.precio_techo || '--'}</div>
                  <div>Precio Ventana m²: ${debugDetallado.precios.precio_ventana_m2 || '--'}</div>
                  <div><strong>Precio kWh: ${debugDetallado.precios.precioKwh || '--'}</strong></div>
                </div>

                {/* INVERSIONES */}
                <div className="debug-section-item">
                  <strong>💸 INVERSIONES:</strong>
                  <div>Inversión 1 (Muro P1): ${debugDetallado.inversiones.inversion1?.toLocaleString() || '--'}</div>
                  <div>Inversión 2 (Muro P2): ${debugDetallado.inversiones.inversion2?.toLocaleString() || '--'}</div>
                  <div>Inversión 3 (Ventana): ${debugDetallado.inversiones.inversion3?.toLocaleString() || '--'}</div>
                  <div>Inversión 4 (Techo): ${debugDetallado.inversiones.inversion4?.toLocaleString() || '--'}</div>
                  <div><strong>Inversión Total: ${debugDetallado.inversiones.inversionTotal?.toLocaleString() || '--'}</strong></div>
                </div>

                {/* AHORROS CO2 */}
                <div className="debug-section-item">
                  <strong>🌿 AHORROS CO2:</strong>
                  <div>Ahorro 1: {debugDetallado.ahorrosCO2.ahorro1?.toFixed(2) || '--'}</div>
                  <div>Ahorro 2: {debugDetallado.ahorrosCO2.ahorro2?.toFixed(2) || '--'}</div>
                  <div>Ahorro 3: {debugDetallado.ahorrosCO2.ahorro3?.toFixed(2) || '--'}</div>
                  <div>Ahorro 4: {debugDetallado.ahorrosCO2.ahorro4?.toFixed(2) || '--'}</div>
                  <div><strong>Reducción CO2 Total: {debugDetallado.ahorrosCO2.reduccionCO2?.toFixed(2) || '--'}</strong></div>
                </div>

                {/* DEBUG - INFORMACIÓN DE EFICIENCIA */}
                <div className="debug-section-item">
                  <strong>📊 CÁLCULO EFICIENCIA (NUEVO):</strong>
                  <div>Consumo Anual: ${formData.consumoAnual || '--'}</div>
                  <div>Precio kWh: ${getPrecioKwh(formData.sistemaCalefaccion) || '--'}</div>
                  <div>Superficie Total: {(parseFloat(superficies.superficie_1) || 0) + (parseFloat(superficies.superficie_2) || 0)} m²</div>
                  <div><strong>Eficiencia: {resultados.eficiencia?.toFixed(1) || '--'} kWh/m² año</strong></div>
                  <div>Color: {resultados.eficiencia > 0 ? getColorEficiencia(resultados.eficiencia) : '--'}</div>
                  <div>Posición en barra: {resultados.eficiencia > 0 ? `${getPosicionBarra(resultados.eficiencia).toFixed(1)}%` : '--'}</div>
                </div>

              </div>
            </div>

            {/* SECCIÓN: RESULTADOS DE LA EVALUACIÓN */}
            <div id="resultados-evaluacion" className="form-section">
              <h2>Resultados de la Evaluación</h2>
              
              {/* BARRA DE GRADIENTE DE EFICIENCIA */}
              <div className="eficiencia-bar-container">
                <div className="eficiencia-bar-label">
                  <span>0 kWh/m² año</span>
                  <span>Eficiencia Energética</span>
                  <span>160+ kWh/m² año</span>
                </div>
                
                <div className="eficiencia-bar">
                  {/* Indicador de posición actual */}
                  {resultados.eficiencia > 0 && (
                    <div 
                      className="eficiencia-indicator"
                      style={{
                        left: `${getPosicionBarra(resultados.eficiencia)}%`
                      }}
                    />
                  )}
                </div>
                
                {/* Leyenda de colores */}
                <div className="eficiencia-legend">
                  <span>≤15</span>
                  <span>55</span>
                  <span>90</span>
                  <span>130</span>
                  <span>160+</span>
                </div>
                
                {/* Valor actual de eficiencia */}
                <div 
                  className="eficiencia-valor-actual"
                  style={{
                    color: resultados.eficiencia > 0 ? getColorEficiencia(resultados.eficiencia) : '#666',
                    borderColor: resultados.eficiencia > 0 ? getColorEficiencia(resultados.eficiencia) : '#dee2e6'
                  }}
                >
                  {resultados.eficiencia > 0 ? (
                    <>
                      <div>Eficiencia Actual: <strong>{resultados.eficiencia.toFixed(1)} kWh/m² año</strong></div>
                      <div className="eficiencia-descripcion">
                        {resultados.eficiencia <= 15 && '✅ Excelente eficiencia'}
                        {resultados.eficiencia > 15 && resultados.eficiencia <= 55 && '🟢 Buena eficiencia'}
                        {resultados.eficiencia > 55 && resultados.eficiencia <= 90 && '🟡 Eficiencia media'}
                        {resultados.eficiencia > 90 && resultados.eficiencia <= 130 && '🟠 Eficiencia baja'}
                        {resultados.eficiencia > 130 && '🔴 Eficiencia muy baja'}
                      </div>
                    </>
                  ) : (
                    'Complete los datos para calcular la eficiencia'
                  )}
                </div>
              </div>
              
              <div className="resultados-table">
                <div className="resultado-fila">
                  <div className="resultado-label">Inversión Requerida</div>
                  <div className="resultado-valor">
                    {resultados.inversion > 0 ? `$${Math.round(resultados.inversion).toLocaleString()}` : '--'}
                  </div>
                </div>
                
                <div className="resultado-fila">
                  <div className="resultado-label">Ahorro Anual Estimado</div>
                  <div className="resultado-valor">
                    {resultados.ahorroAnual > 0 ? `$${Math.round(resultados.ahorroAnual).toLocaleString()}` : '--'}
                  </div>
                </div>
                
                <div className="resultado-fila">
                  <div className="resultado-label">Periodo de Retorno</div>
                  <div className="resultado-valor">
                    {resultados.payback > 0 ? `${resultados.payback.toFixed(1)} años` : '--'}
                  </div>
                </div>
                
                <div className="resultado-fila">
                  <div className="resultado-label">Reducción de CO₂</div>
                  <div className="resultado-valor">
                    {resultados.reduccionCO2 > 0 ? `${Math.round(resultados.reduccionCO2).toLocaleString()} kg` : '--'}
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              className="submit-btn btn-centrado"
              onClick={guardarEvaluacion}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          </>
        )}
      </div>
    </Layout>
  );
}

export default EvaluacionCalefaccion;