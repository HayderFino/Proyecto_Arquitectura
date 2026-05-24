# 🎤 Guía de Sustentación Oral y Presentación — Corte 2

Este documento es una guía estructurada para la sustentación del proyecto **Smart Energy Hub** ante el jurado evaluador para el Corte 2. Define el guion de presentación, los puntos de énfasis arquitectónicos y la distribución recomendada del discurso entre los integrantes del equipo.

---

## ⏱️ Estructura del Tiempo (Ejemplo: 15 Minutos)

1.  **Introducción, Problema y Objetivos** (2 min) — *Sebastián Castillo (Frontend)*
2.  **Propuesta de Arquitectura y Decisiones (EDA + Microservicios)** (4 min) — *Hayder Fino (Líder/Arquitecto)*
3.  **Corte 2: Seguridad (Firebase JWT), C4 y Vistas 4+1** (3 min) — *Jesús Hernández (Backend)*
4.  **Evaluación de Calidad (ATAM: Disponibilidad)** (3 min) — *Hayder Fino*
5.  **Demostración Práctica (El Prototipo en Acción)** (3 min) — *Equipo Completo*

---

## 💬 Guion de Presentación Paso a Paso

### 1. Introducción, Problema y Objetivos
*   **Quién habla**: *Sebastián Castillo*
*   **Qué decir**:
    > "Buenos días ingenieros. Hoy les presentamos **Smart Energy Hub**. 
    > 
    > El problema central que atacamos es la **falta de visibilidad del consumo energético por dispositivo individual** en hogares y comercios. Sin esta información oportuna, se genera desperdicio de energía, altos costos operativos y la imposibilidad de reaccionar rápidamente ante picos de consumo anómalos.
    > 
    > Para solucionarlo, diseñamos e implementamos una plataforma web interactiva que ingesta telemetría de sensores, calcula medias móviles en tiempo real para detectar anomalías y genera notificaciones instantáneas para el usuario."

*   **Énfasis en Diapositivas**: Mostrar la pantalla principal del Dashboard (KPIs, barra de carga por dispositivo y el gráfico circular de distribución de energía).

---

### 2. Propuesta de Arquitectura y Decisiones (EDA + Microservicios)
*   **Quién habla**: *Hayder Fino*
*   **Qué decir**:
    > "Como arquitecto del proyecto, la decisión más crítica fue el estilo arquitectónico. Descartamos un monolito tradicional y optamos por una **Arquitectura de Microservicios Orientada a Eventos (EDA)** usando **RabbitMQ** como message broker.
    > 
    > ¿Por qué esta decisión? Porque el monitoreo energético genera flujos continuos de datos. Necesitábamos **desacoplar** totalmente la velocidad de la Ingesta de Datos del procesamiento analítico. 
    > 
    > Si el microservicio de Analítica sufre una caída por sobrecarga, la Ingesta de sensores no se bloquea y los datos no se pierden; RabbitMQ actúa como un buffer persistente y, al recuperarse el servicio de analítica, procesa todos los mensajes acumulados en orden. Esta decisión está documentada formalmente en nuestros registros de decisiones de arquitectura: **ADR-001 y ADR-002**."

*   **Énfasis en Diapositivas**: Mostrar el diagrama de contenedores C4 con el broker de RabbitMQ en el centro y las colas `sensor.data.raw` y `alerts.generated`.

---

### 3. Corte 2: Seguridad, C4 Componentes y Vistas 4+1
*   **Quién habla**: *Jesús Hernández*
*   **Qué decir**:
    > "Para este Corte 2, logramos aterrizar el proyecto enfocándonos en dos frentes clave: **seguridad** y **modularización**.
    > 
    > Implementamos la autenticación de forma centralizada en el **API Gateway** utilizando el patrón *Strangler Fig* y **Firebase Authentication** con Google Login. El Gateway intercepta las llamadas, verifica la firma del token JWT con el SDK de Firebase y protege las API internas sin sobrecargar a los microservicios con código de autenticación redundante.
    > 
    > Para documentar esta descomposición detallada a nivel de código y diseño, expandimos el **Modelo C4 a Nivel 3 (Componentes)** y mapeamos la arquitectura bajo el estándar del **Modelo de Vistas 4+1**. La *Vista Lógica* modela nuestros esquemas NoSQL en MongoDB, la *Vista de Procesos* detalla la sincronización de mensajes asíncronos y la *Vista Física* define nuestro esquema de despliegue en producción."

*   **Énfasis en Diapositivas**: Mostrar el diagrama de Componentes del API Gateway e Ingesta, y explicar brevemente la integración con Firebase.

---

### 4. Evaluación de Calidad (ATAM)
*   **Quién habla**: *Hayder Fino*
*   **Qué decir**:
    > "Nuestra arquitectura no nació de preferencias tecnológicas, sino de los atributos de calidad requeridos por el negocio. Evaluamos la arquitectura utilizando el método **ATAM**.
    > 
    > Identificamos que la **Disponibilidad** es nuestro atributo de calidad supremo (99.9% de uptime y 0% de pérdida de eventos de sensores). Para garantizarla, aplicamos la táctica de **Redundancia Pasiva con Buffer** mediante colas durables de RabbitMQ con confirmaciones explícitas (AMQP ACKs).
    > 
    > Aceptamos conscientemente un *trade-off*: sacrificamos consistencia inmediata por rendimiento y disponibilidad. El usuario del frontend recibe sus métricas actualizadas de manera asíncrona con una consistencia eventual, garantizando que el sistema jamás sufra una caída total por bloqueo síncrono."

*   **Énfasis en Diapositivas**: Mostrar la Matriz de Trade-offs y el escenario de disponibilidad evaluado.

---

### 5. Demostración Práctica (El Prototipo en Acción)
*   **Quién habla**: *Equipo Completo*
*   **Qué hacer**:
    1.  **Arranque**: Explicar al jurado que el sistema corre en su totalidad localmente de forma normal utilizando el script de automatización `iniciar_servicios.bat`.
    2.  **Métricas en Vivo**: Mostrar cómo el simulador empieza a enviar datos y las gráficas en tiempo real de Recharts en el frontend se actualizan con baja latencia.
    3.  **Simulación de Pico**: Cambiar en la pestaña "Settings" la probabilidad de pico y mostrar cómo al generarse una lectura anómala (> 2.5x la media móvil) se dispara inmediatamente un Toast flotante y se registra la alerta roja con nivel de severidad ("Critical", "High", etc.).
    4.  **Prueba de Disponibilidad (El "Momento Wow")**: 
        *   *(Opcional / Explicado)* Detener el proceso del microservicio de Analítica.
        *   Mostrar que el dashboard sigue cargando y la Ingesta de sensores no se detiene (se siguen enviando y guardando datos en MongoDB).
        *   Volver a encender Analítica y mostrar cómo consume todos los mensajes acumulados y genera las alertas pendientes inmediatamente de golpe.

---

## 🎯 Consejos para Responder Preguntas del Jurado

*   **Si preguntan: "¿Por qué Node.js en todos los microservicios?"**
    *   *Respuesta*: "Para mantener consistencia en el lenguaje de desarrollo de todo el equipo (JavaScript), simplificar la portabilidad y porque Node.js tiene un modelo no bloqueante de I/O por eventos idóneo para APIs livianas y gateways WebSocket."
*   **Si preguntan: "¿Por qué MongoDB en lugar de una base de datos relacional (SQL)?"**
    *   *Respuesta*: "Por la velocidad de escritura secuencial (append-only) de las métricas de sensores y la flexibilidad de esquema. Si el día de mañana un sensor mide también 'humedad' o 'temperatura', el documento NoSQL lo soporta sin alterar esquemas rígidos ni causar migraciones de BD costosas."
*   **Si preguntan: "¿Cómo solucionan el problema de que RabbitMQ sea un único punto de fallo (SPOF)?"**
    *   *Respuesta*: "Es un riesgo identificado en nuestro análisis ATAM. En producción, se soluciona desplegando RabbitMQ en modo cluster de alta disponibilidad con réplicas activas (Classic Mirrored Queues o Quorum Queues) distribuidas en múltiples zonas físicas."
