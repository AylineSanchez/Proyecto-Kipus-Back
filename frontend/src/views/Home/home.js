
// kipus/src/views/Home/home.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';
import logoHorizontal from '../../assets/VIVIENDA SUSTENTABLE HORIZONTAL.png';
import logoUtalca from '../../assets/logo_utalca.png';

const Home = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!token;

  // Datos del carrusel mejorado
  const carouselSlides = [
    {
      id: 1,
      title: "KIPUS A+",
      subtitle: "Gestión Inteligente de Energía y Agua",
      description: "Optimiza el consumo de recursos en tu hogar con nuestra plataforma especializada"
    },
    {
      id: 2,
      title: "Eficiencia Energética",
      subtitle: "Calefacción eficiente para tu hogar",
      description: "Reduce costos y mejora el confort térmico"
    },
    {
      id: 3,
      title: "Ahorro de Agua",
      subtitle: "Gestión sostenible del recurso hídrico",
      description: "Controla y optimiza tu consumo de agua"
    }
  ];

  // Efecto para el carrusel automático
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [carouselSlides.length]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const handleGoToDashboard = () => {
    navigate('/evaluaciones');
  };

  const handleGoToLogin = () => {
    navigate('/inicio-sesion');
  };

  const handleGoToRegister = () => {
    navigate('/registro');
  };

  const handleGoToCalefaccion = () => {
    navigate('/evaluacion-calefaccion');
  };

  const handleGoToAgua = () => {
    navigate('/evaluacion-agua');
  };

  return (
    <div className="home-container">
      {/* Header estilo Kipus.cl */}
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
          <nav className="header-nav">
            {isLoggedIn ? (
              <>
                <span className="user-welcome">Bienvenido, {userData.nombre_completo || 'Usuario'}</span>
                <button className="nav-btn" onClick={handleGoToDashboard}>
                  Dashboard
                </button>
                <button className="nav-btn logout" onClick={handleLogout}>
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <button className="nav-btn" onClick={handleGoToLogin}>
                  Iniciar Sesión
                </button>
                <button className="nav-btn primary" onClick={handleGoToRegister}>
                  Registrarse
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section con Carrusel */}
      <section className="hero-section">
        <div className="carousel-container">
          <div 
            className="carousel-track"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {carouselSlides.map((slide) => (
              <div key={slide.id} className="carousel-slide">
                <div className="slide-content">
                  <h1 className="slide-title">{slide.title}</h1>
                  <h2 className="slide-subtitle">{slide.subtitle}</h2>
                  <p className="slide-description">{slide.description}</p>
                  <div className="slide-actions">
                    {!isLoggedIn ? (
                      <>
                        <button className="btn-primary large" onClick={handleGoToRegister}>
                          Comenzar Ahora
                        </button>
                        <button className="btn-primary large" onClick={handleGoToLogin}>
                          Ingresar
                        </button>
                      </>
                    ) : (
                      <>
                      
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Indicadores del carrusel */}
          <div className="carousel-indicators">
            {carouselSlides.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2>¿Qué es KIPUS A+?</h2>
              <p>
                KIPUS A+ es una plataforma innovadora desarrollada para optimizar 
                el consumo de energía y agua en viviendas chilenas. Combinando 
                tecnología avanzada con análisis especializado, proporcionamos 
                herramientas para evaluar, monitorear y mejorar la eficiencia 
                de recursos en tu hogar.
              </p>
              <p>
                Nuestra solución está diseñada para empoderar a las familias 
                con información clara y recomendaciones prácticas que generan 
                ahorros concretos mientras contribuyen al cuidado del medio ambiente.
              </p>
            </div>
            <div className="about-features">
              <div className="feature-grid">
                <div className="feature-item">
                  <div className="feature-icon">🔥</div>
                  <h4>Evaluación de Calefacción</h4>
                  <p>Análisis completo de eficiencia térmica y recomendaciones personalizadas</p>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">💧</div>
                  <h4>Gestión del Agua</h4>
                  <p>Control inteligente y optimización del consumo hídrico</p>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">📊</div>
                  <h4>Dashboard Interactivo</h4>
                  <p>Seguimiento en tiempo real y reportes detallados</p>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🌱</div>
                  <h4>Sostenibilidad</h4>
                  <p>Soluciones que contribuyen al cuidado ambiental</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="solutions-section">
        <div className="container">
          <div className="section-header">
            <h2>Nuestras Soluciones</h2>
            <p>Herramientas especializadas para la gestión eficiente de recursos</p>
          </div>
          
          <div className="solutions-grid">
            <div className="solution-card">
              <div className="card-icon">🔥</div>
              <h3>Evaluación de Calefacción</h3>
              <p>
                Analiza la eficiencia térmica de tu vivienda y recibe recomendaciones 
                personalizadas para optimizar el consumo de calefacción.
              </p>
            </div>
            
            <div className="solution-card">
              <div className="card-icon">💧</div>
              <h3>Gestión del Agua</h3>
              <p>
                Controla y mejora el consumo hídrico con evaluaciones detalladas 
                y sugerencias de dispositivos eficientes.
              </p>
            </div>
            
            <div className="solution-card">
              <div className="card-icon">📈</div>
              <h3>Reportes y Análisis</h3>
              <p>
                Accede a reportes detallados, gráficos interactivos y análisis 
                comparativos para decisiones informadas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="disclaimer-section">
        <div className="container">
          <div className="disclaimer-content">
            <h3>Nota importante sobre los cálculos</h3>
            <p>
              Para agilizar los cálculos y el levantamiento de información, esta aplicación utiliza 
              aproximaciones y supuestos cuidadosamente definidos, diseñados para representar de 
              forma realista su situación. Si bien estos pueden influir en la precisión exacta de 
              los resultados, la herramienta le entregará una visión inicial clara que le permitirá 
              detectar oportunidades de mejora desde el primer momento.
            </p>
            <p>
              Si desea avanzar hacia un diagnóstico más completo y preciso, nuestro equipo puede 
              realizar una simulación dinámica detallada para identificar el potencial real de 
              ahorro energético e hídrico de su proyecto. Le invitamos a{' '}
              <a href="mailto:info@kipus.cl?subject=Cotización diagnóstico detallado" className="disclaimer-link">
                solicitar una cotización aquí
              </a>{' '}
              y descubrir cómo podemos acompañarle en la implementación de soluciones de alto impacto.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>¿Listo para optimizar tus recursos?</h2>
            <p>
              Únete a KIPUS A+ y comienza tu journey hacia la eficiencia energética 
              y la gestión sostenible del agua.
            </p>
            <div className="cta-actions">
              {!isLoggedIn ? (
                <>
                  <button className="btn-primary large" onClick={handleGoToRegister}>
                    Crear Cuenta Gratis
                  </button>
                  <button className="btn-primary large" onClick={handleGoToLogin}>
                    Ingresar a Mi Cuenta
                  </button>
                </>
              ) : (
                <>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
          <div className="footer-content">
            {/* Logo Kipus */}
            <div className="footer-brand">
                <img 
                  src={logoHorizontal} 
                  alt="Kipus A+ Vivienda Sustentable" 
                  className="navbar-logo"
                />
            </div>
            
            {/* Información de contacto */}
            <div className="footer-contact-info">
              {/* Teléfono */}
              <div className="contact-item">
                <div className="contact-icon">
                  📞
                </div>
                <div className="contact-content">
                  <h4>Llámanos</h4>
                  <p>+56 75 2201756</p>
                </div>
              </div>
              
              {/* Email */}
              <div className="contact-item">
                <div className="contact-icon">
                  ✉️
                </div>
                <div className="contact-content">
                  <h4>Escríbenos</h4>
                  <p>kipus@utalca.cl</p>
                </div>
              </div>
              
              {/* Dirección */}
              <div className="contact-item">
                <div className="contact-icon">
                  📍
                </div>
                <div className="contact-content">
                  <h4>Dirección</h4>
                  <p>Camino a los Niches Km 1,<br />Curicó, Chile</p>
                </div>
              </div>
            </div>
          </div>
          <p id='footer-description'>
            Plataforma de gestión de recursos para hogares chilenos
          </p>
          <div className="footer-bottom">
            <p>&copy; 2025 KIPUS A+</p>
          </div>
      </footer>
    </div>
  );
};

export default Home;