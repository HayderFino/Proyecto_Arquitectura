# 🏛️ ATAM Simplificado — Escenario Seleccionado
## Smart Energy Hub · Evaluación Arquitectónica

> **Proyecto:** Smart Energy Hub — Plataforma de Monitoreo Energético en Tiempo Real  
> **Asignatura:** Arquitectura y Diseño de Software  
> **Institución:** UNISANGIL — Ingeniería de Sistemas  
> **Fecha:** Abril 2026  

---

## Equipo y Roles ATAM

| Rol | Nombre | Responsabilidad en la sesión |
|-----|--------|------------------------------|
| 🔍 **Evaluador** | Sebastián Castillo | Analiza la arquitectura de forma imparcial, asigna puntajes, identifica trade-offs y riesgos |
| 👤 **Stakeholder** | Juan David | Representa los intereses del usuario y el negocio; plantea preguntas, prioriza atributos |
| 🏗️ **Arquitecto** | Hayder Fino | Presenta y defiende las decisiones de diseño; explica cómo la arquitectura satisface cada atributo |

---

## 1. Escenario Seleccionado

> **E2 — Disponibilidad del sistema bajo fallo de un microservicio**

Este escenario se selecciona porque representa el **riesgo más crítico** de la arquitectura propuesta: ¿qué ocurre con el flujo completo de datos cuando uno de los servicios internos falla? La respuesta a esta pregunta define si la apuesta por microservicios + EDA realmente cumple su promesa de tolerancia a fallos.

### Ficha del Escenario

| Campo | Descripción |
|-------|-------------|
| **ID** | E2 |
| **Atributo de calidad** | Disponibilidad |
| **Estímulo** | El microservicio de **Analítica** (puerto 3002) se cae inesperadamente |
| **Fuente del estímulo** | Fallo interno — error de memoria o excepción no controlada |
| **Ambiente** | Sistema en producción, con sensores enviando datos cada 3 segundos |
| **Artefactos afectados** | RabbitMQ (cola `sensor.data.raw`) · Microservicio Ingesta · Microservicio Alertas |
| **Respuesta esperada** | Los mensajes de Ingesta siguen publicándose en el broker; cuando Analítica se recupere, los procesa sin pérdida |
| **Medida de respuesta** | 0% de pérdida de lecturas de sensores; tiempo de recuperación < 60 segundos |

---

## 2. Presentación del Arquitecto — Hayder Fino

> *El arquitecto expone cómo la arquitectura actual responde al escenario E2.*

### ¿Cómo está diseñado el sistema para este escenario?

La arquitectura de **Smart Energy Hub** adopta el patrón **Event-Driven Architecture (EDA)** con **RabbitMQ como message broker**. El flujo de datos es:

```
Simulador de Sensores
      │
      ▼  POST /ingest/batch
┌─────────────┐        publica en cola
│  Ingesta    │ ──────────────────────► sensor.data.raw (RabbitMQ)
│  (3001)     │                                │
└─────────────┘                                │
                                               ▼ consume
                                       ┌────────────────┐
                                       │   Analítica    │  ← FALLA AQUÍ
                                       │   (3002)       │
                                       └────────────────┘
                                               │
                                               ▼ publica en cola
                                       alerts.generated
                                               │
                                               ▼ consume
                                       ┌────────────────┐
                                       │    Alertas     │
                                       │    (3003)      │
                                       └────────────────┘
```

### Decisiones que protegen la disponibilidad en este escenario:

| Decisión Arquitectónica | Efecto en el escenario E2 |
|------------------------|---------------------------|
| **RabbitMQ como buffer asíncrono** | Si Analítica cae, los mensajes en `sensor.data.raw` quedan acumulados en la cola; Ingesta **sigue funcionando** sin interrupción |
| **Dead Letter Queue (DLQ)** | Los mensajes que no pueden procesarse (ej. Analítica caída) se redirigen a una cola de mensajes fallidos; no se pierden |
| **Microservicios independientes** | Ingesta, Alertas y API Gateway **no se detienen** cuando Analítica falla; el fallo está aislado |
| **Acknowledgements en RabbitMQ** | Un mensaje solo se descarta de la cola cuando Analítica confirma que lo procesó correctamente |
| **Docker Compose con restart policy** | El contenedor de Analítica tiene `restart: unless-stopped`; se reinicia automáticamente ante fallos |

**Tiempo de recuperación estimado:** El contenedor se reinicia en ~10–20 segundos. Al levantar, Analítica empieza a consumir los mensajes acumulados automáticamente.

---

## 3. Cuestionamiento del Stakeholder — Juan David

> *El stakeholder plantea preguntas críticas desde la perspectiva del usuario y el negocio.*

### Preguntas planteadas al Arquitecto:

---

**Pregunta 1:**
> *"Si Analítica se cae durante 5 minutos, ¿el usuario del dashboard nota algo?"*

**Respuesta del Arquitecto (Hayder):**  
Sí, lo notará parcialmente. Las alertas dejarán de generarse y los KPIs de analítica no se actualizarán durante esos 5 minutos. Sin embargo, el dashboard seguirá mostrando los últimos datos disponibles y el historial de métricas no se pierde. Cuando Analítica se recupere, procesará todos los eventos acumulados y el panel vuelve a funcionar con normalidad.

---

**Pregunta 2:**
> *"¿Cuántos mensajes se acumularían en la cola si el servicio está caído 5 minutos, con 6 dispositivos enviando datos cada 3 segundos?"*

**Cálculo del Arquitecto (Hayder):**  
```
6 dispositivos × (300 segundos / 3 segundos) = 600 mensajes acumulados
```
RabbitMQ puede manejar cientos de miles de mensajes en cola sin problema. 600 mensajes es un volumen mínimo; al reiniciarse Analítica, los procesa en segundos.

---

**Pregunta 3:**
> *"¿Y si el que se cae es el API Gateway? ¿El usuario también queda sin acceso?"*

**Respuesta del Arquitecto (Hayder):**  
Sí. El API Gateway es actualmente un **punto único de fallo (SPOF)**. Si cae, el frontend pierde conexión total con el backend. Este es el riesgo más importante identificado y está planificado para mitigarse en Corte 2 con una segunda instancia y balanceador de carga.

---

**Pregunta 4:**
> *"¿Hay alguna forma de que el usuario sepa que el sistema está en modo degradado?"*

**Respuesta del Arquitecto (Hayder):**  
Actualmente no hay indicador visual de estado del sistema. Es una mejora pendiente: añadir un banner de "Sistema en modo degradado" cuando los WebSockets pierdan conexión por más de N segundos.

---

## 4. Evaluación — Sebastián Castillo

> *El evaluador analiza la arquitectura frente al escenario E2 de forma objetiva y emite veredictos.*

### 4.1 Evaluación por componente

| Componente | Satisfacción del atributo Disponibilidad | Calificación (1–3) | Observación |
|-----------|------------------------------------------|--------------------|-------------|
| **RabbitMQ (broker)** | Alta — buffer natural ante caídas | **3** | Correcto uso del patrón; los mensajes no se pierden |
| **Microserv. Ingesta** | Alta — sigue operando independientemente | **3** | Bien desacoplado; no depende de Analítica |
| **Microserv. Analítica** | Baja — es el componente que falla | **1** | Sin redundancia ni réplica activa |
| **API Gateway** | Baja — SPOF no mitigado | **1** | Riesgo crítico identificado; sin respaldo actual |
| **Docker Compose** | Medio — restart automático configurado | **2** | Mitiga caídas transitorias; no garantiza HA real |
| **Dead Letter Queue** | Alta — mensajes fallidos preservados | **3** | Correctamente implementado |

### 4.2 Puntaje de Disponibilidad en el escenario E2

```
Componentes evaluados: 6
Suma de calificaciones: 3 + 3 + 1 + 1 + 2 + 3 = 13
Máximo posible:        6 × 3 = 18
Puntaje:               13 / 18 × 100 = 72/100
```

> **Resultado:** 🟡 **72/100 — Disponibilidad ACEPTABLE con riesgos activos**

### 4.3 Puntos de sensibilidad identificados

| PS | Elemento | Riesgo |
|----|----------|--------|
| **PS-1** | API Gateway (puerto 8080) | SPOF total — si cae, el sistema es 100% inaccesible |
| **PS-2** | Microserv. Analítica sin réplica | Degradación funcional durante el tiempo de reinicio (~15-20s) |
| **PS-3** | Almacenamiento en memoria (prototipo) | Al reiniciar Analítica, los datos de la ventana de media móvil se pierden |

### 4.4 Trade-Off principal del escenario E2

> **Rendimiento vs. Disponibilidad — El costo del buffer asíncrono**

| | |
|--|--|
| **Decisión** | Usar RabbitMQ como intermediario asíncrono entre Ingesta y Analítica |
| **Ganancia en Disponibilidad** | ✅ Ingesta no se detiene cuando Analítica cae; los mensajes se preservan en cola |
| **Costo en Rendimiento** | ⚠️ Cada evento pasa por un hop adicional (Ingesta → Broker → Analítica), añadiendo ~200–400ms de latencia |
| **Veredicto del Evaluador** | El trade-off está **bien resuelto** para este dominio. La pérdida de 200–400ms es tolerable frente a los beneficios de no perder datos durante fallos. El SLA de < 2s sigue siendo alcanzable. |

### 4.5 Veredicto Final del Evaluador

```
┌──────────────────────────────────────────────────────────────────┐
│  EVALUACIÓN ESCENARIO E2 — DISPONIBILIDAD                        │
│                                                                  │
│  Puntaje obtenido:    72 / 100                                   │
│  Clasificación:       ACEPTABLE con riesgos activos              │
│                                                                  │
│  ✅ FORTALEZAS                                                   │
│     • RabbitMQ garantiza cero pérdida de datos de sensores      │
│     • Microservicios desacoplados limitan el impacto del fallo  │
│     • DLQ protege mensajes que no pueden procesarse             │
│     • Docker restart mitiga caídas transitorias automáticamente │
│                                                                  │
│  ⚠️  RIESGOS ACTIVOS                                            │
│     • API Gateway es un SPOF sin mitigación actual             │
│     • Sin indicador visual al usuario de modo degradado         │
│     • Estado de Analítica (media móvil) se pierde al reiniciar │
│                                                                  │
│  📌 RECOMENDACIONES PARA CORTE 2                                │
│     1. Añadir réplica del API Gateway con Nginx upstream        │
│     2. Persistir estado de ventana de media móvil en Redis/DB   │
│     3. Implementar health check y banner de sistema degradado   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Resumen de la Sesión ATAM

| Elemento | Resultado |
|----------|-----------|
| **Escenario evaluado** | E2 — Disponibilidad ante caída del Microservicio Analítica |
| **Atributo principal** | Disponibilidad |
| **Puntaje global** | 72 / 100 |
| **Trade-off identificado** | Rendimiento vs. Disponibilidad (latencia de broker vs. tolerancia a fallos) |
| **punto de sensibilidad crítico** | API Gateway como Single Point of Failure |
| **Decisión más acertada** | RabbitMQ como buffer — garantiza cero pérdida de datos de ingesta |
| **Mayor riesgo pendiente** | API Gateway sin réplica — riesgo de inaccesibilidad total |

---

## 6. Acuerdos de la Sesión

Durante la sesión ATAM, los tres participantes acordaron:

1. ✅ La arquitectura **cumple parcialmente** con el atributo de disponibilidad para el escenario E2
2. ✅ El uso de RabbitMQ como broker es la **decisión más sólida** en términos de tolerancia a fallos
3. ⚠️ El API Gateway como SPOF es el **riesgo más urgente** a resolver en la siguiente iteración
4. 📌 Se prioriza para Corte 2: réplica del Gateway + persistencia del estado de Analítica

---

*Documento elaborado como actividad de evaluación — Método ATAM Simplificado*  
*UNISANGIL · Ingeniería de Sistemas · Arquitectura y Diseño de Software · Abril 2026*

| Rol | Nombre | Firma |
|-----|--------|-------|
| Evaluador | Sebastián Castillo | _________________ |
| Stakeholder | Juan David | _________________ |
| Arquitecto | Hayder Fino | _________________ |
