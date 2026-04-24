# 🏗️ Análisis ADD — Smart Energy Hub
### Attribute-Driven Design (ADD 3.0)

> **Proyecto:** Smart Energy Hub — Plataforma de Monitoreo Energético en Tiempo Real  
> **Equipo:** Hayder Fino · Jesús Hernández · Sebastián Castillo  
> **Institución:** UNISANGIL — Ingeniería de Sistemas  
> **Asignatura:** Arquitectura y Diseño de Software · Corte 1 · Marzo 2026  

---

## ✅ RESPUESTAS CLAVE — Lo que el ADD Evidencia

> Estas son las tres respuestas centrales que el análisis ADD sustenta para el proyecto **Smart Energy Hub**. El resto del documento detalla el proceso iterativo que llevó a estas conclusiones.

---

### ❓ 1. ¿Cuál es el Atributo de Calidad más importante?

## 🔴 DISPONIBILIDAD

| | |
|---|---|
| **Métrica exigida** | 99.9% uptime — operación continua 24/7 |
| **Escenario crítico** | Si el Microservicio de Analítica falla → **0% de pérdida de datos de sensores** |
| **¿Por qué es el más importante?** | El sistema monitorea consumo energético en tiempo real. Un fallo significa picos no detectados y consecuencias económicas directas para los usuarios |
| **Evidencia en el proyecto** | RNF: *"Sistema operativo 24/7"* · ADR-001: *"Si Analítica cae, Ingesta sigue recibiendo datos"* · Riesgo documentado: *"Pérdida de eventos — Impacto ALTO"* |

---

### ❓ 2. ¿Qué Táctica aplicarían?

## 🔧 REDUNDANCIA PASIVA MEDIANTE BUFFER DE MENSAJES

| | |
|---|---|
| **Categoría SEI** | Tácticas de Disponibilidad → Recuperación de Fallos → Redundancia Pasiva |
| **Implementación** | RabbitMQ actúa como buffer persistente entre microservicios |
| **Mecanismo** | AMQP Acknowledgements (ACK/NACK) + Dead Letter Queue (DLQ) |
| **Efecto** | Los mensajes esperan en cola aunque el consumidor esté caído; al recuperarse, procesa todos sin pérdida |

```
ANTES (sin táctica): Analítica cae → Ingesta falla en cascada → datos PERDIDOS ❌
DESPUÉS (con táctica): Analítica cae → mensajes en cola RabbitMQ → Analítica
                       se recupera → procesa mensajes acumulados → 0% pérdida ✅
```

---

### ❓ 3. ¿Qué Patrón usarían?

## 🏗️ PUBLISHER / SUBSCRIBER (Pub/Sub) sobre EVENT-DRIVEN ARCHITECTURE

| | |
|---|---|
| **Patrón** | Publisher/Subscriber (Pub/Sub) |
| **Estilo arquitectónico** | Event-Driven Architecture (EDA) |
| **Implementación** | Ingesta publica → RabbitMQ → Analítica y Alertas suscriben |
| **Desacoplamiento** | Espacial (los servicios no se conocen) + Temporal (no necesitan estar activos al mismo tiempo) |

```
  ┌──────────┐   pub   ┌─────────────────────┐   sub   ┌─────────────┐
  │ Ingesta  │────────►│  RabbitMQ (Broker)  │────────►│  Analítica  │
  │  (3001)  │         │                     │         │   (3002)    │
  └──────────┘         │  sensor.data.raw    │         └─────────────┘
                       │  alerts.generated   │   sub   ┌─────────────┐
                       │                     │────────►│   Alertas   │
                       └─────────────────────┘         │   (3003)    │
                                                        └─────────────┘
```

> **¿Por qué este patrón?** Porque desacopla totalmente productores de consumidores.
> Si Alertas falla, Ingesta y Analítica **siguen funcionando sin interrupciones**.

---

## 1. ¿Qué es ADD?

El **Attribute-Driven Design (ADD)** es un método de diseño arquitectónico iterativo desarrollado por el SEI (Software Engineering Institute) que usa los **atributos de calidad como conductores (drivers)** de las decisiones de descomposición del sistema.

A diferencia de ATAM (que *evalúa* una arquitectura existente), **ADD *diseña* la arquitectura desde cero**, partiendo de los requerimientos de calidad para seleccionar patrones y tácticas que los satisfagan.

### Proceso ADD 3.0 — Pasos por Iteración

```
Para cada iteración de diseño:
  Paso 1 → Revisar entradas (inputs) de diseño
  Paso 2 → Establecer el objetivo de iteración y elegir el elemento a refinar
  Paso 3 → Elegir uno o más conceptos de diseño que satisfagan los drivers
  Paso 4 → Instanciar elementos arquitectónicos y asignar responsabilidades
  Paso 5 → Definir interfaces de los elementos instanciados
  Paso 6 → Verificar y refinar los casos de uso y escenarios de atributos de calidad
```

---

## 2. Entradas del Proceso ADD (Step 0 — Inputs)

### 2.1 Propósito del Sistema

> Plataforma web de monitoreo energético en tiempo real que recibe datos de sensores simulados, detecta picos de consumo y presenta alertas clasificadas en un dashboard interactivo.

### 2.2 Requerimientos Funcionales (Drivers Funcionales)

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| RF1 | Recibir datos energéticos en tiempo real desde sensores simulados | Alta |
| RF2 | Almacenar métricas históricas por dispositivo | Alta |
| RF3 | Detectar picos y patrones de consumo elevado | Alta |
| RF4 | Generar y mostrar alertas clasificadas por severidad | Alta |
| RF5 | Mostrar dashboard web interactivo con gráficas en tiempo real | Alta |

### 2.3 Escenarios de Atributos de Calidad (QAS) — Drivers Arquitectónicos

Estos escenarios son la **entrada principal** del ADD; guían qué conceptos de diseño elegir.

| ID | Atributo | Fuente | Estímulo | Artefacto | Respuesta | Medida |
|----|----------|--------|----------|-----------|-----------|--------|
| **QAS-01** | **Disponibilidad** | Fallo interno | Microservicio de Analítica cae | Sistema completo | Ingesta sigue funcionando; datos no se pierden | 0% pérdida de eventos; recuperación < 30s |
| **QAS-02** | **Rendimiento** | Simulador de sensores | 6 dispositivos envían lecturas c/3s | API de Ingesta | Lecturas procesadas y visibles en dashboard | Latencia end-to-end < 2 segundos |
| **QAS-03** | **Escalabilidad** | Crecimiento del sistema | Se duplica número de sensores | Capa de procesamiento | Sistema soporta carga adicional sin rediseño | Escalado horizontal por servicio individual |
| **QAS-04** | **Mantenibilidad** | Equipo de desarrollo | Se requiere cambiar módulo de alertas | Microservicio Alertas | Cambio sin afectar otros servicios | 0 servicios afectados por despliegue independiente |
| **QAS-05** | **Seguridad** | Usuario externo | Petición sin autenticación | API Gateway | Solicitud rechazada con 401 | 100% peticiones sin JWT válido rechazadas |

### 2.4 Restricciones del Sistema

| Restricción | Tipo | Impacto en Diseño |
|-------------|------|-------------------|
| Stack: Node.js en todo el backend | Tecnológica | Consistencia de runtime entre microservicios |
| Prototipo sin hardware real de sensores | Negocio | Requiere módulo simulador configurable |
| Despliegue local con Docker Compose | Tecnológica | Orquestación reproducible en un solo comando |
| Autenticación diferida a Corte 2 | Negocio | Diseño de Gateway debe anticipar JWT sin implementarlo aún |
| Presupuesto/tiempo de equipo universitario | Negocio | Soluciones probadas, no innovación de infraestructura |

---

## 3. Identificación de Drivers Arquitectónicos

Los **drivers** son los requisitos que más influyen en la arquitectura. Se seleccionan combinando importancia para el negocio y dificultad técnica.

```
        ALTA IMPORTANCIA NEGOCIO
              │
    ┌─────────┼──────────────┐
    │         │              │
  QAS-01   QAS-02         QAS-03
(Disponib) (Rendim.)    (Escalab.)   ← DRIVERS PRIMARIOS ✅
    │         │              │
    └─────────┼──────────────┘
              │
    QAS-04  QAS-05
  (Manteni.) (Segur.)              ← DRIVERS SECUNDARIOS
              │
        BAJA IMPORTANCIA
```

> **Driver Principal Seleccionado: QAS-01 — DISPONIBILIDAD**  
> Razón: Un sistema de monitoreo energético 24/7 en el que los fallos generan pérdida de datos de consumo crítico. La arquitectura entera fue justificada en el ADR-001 en torno a tolerar fallos parciales.

---

## 4. Iteración 1 — Diseño del Sistema Completo

### Objetivo de la Iteración
> Definir la estructura de alto nivel del sistema para satisfacer **QAS-01 (Disponibilidad)** y **QAS-03 (Escalabilidad)** como drivers primarios.

---

### Paso 3 — Concepto de Diseño Elegido: **Microservicios + Event-Driven Architecture (EDA)**

#### Alternativas consideradas

| Concepto | Disponibilidad | Escalabilidad | Complejidad | Decisión |
|----------|----------------|---------------|-------------|----------|
| **Monolito** | Baja — fallo único afecta todo | Baja — escala todo junto | Baja | ❌ Descartado |
| **Serverless** | Media — cold starts | Media | Media | ❌ Cold starts incompatibles con latencia < 2s |
| **Microservicios + EDA** | **Alta — fallo aislado** | **Alta — escala por función** | Alta | ✅ **Seleccionado** |

#### Justificación del Concepto

El concepto **Microservicios + EDA** satisface los drivers de la siguiente forma:

```
QAS-01 (Disponibilidad):
  → Cada servicio es un proceso independiente: si Analítica falla, 
    Ingesta continúa recibiendo datos
  → El broker RabbitMQ actúa como buffer entre productores y consumidores
  → Los mensajes se persisten en cola hasta que el consumidor está disponible

QAS-03 (Escalabilidad):
  → Ingesta puede desplegarse en múltiples instancias si el volumen crece
  → Analítica puede escalar independientemente de Alertas
  → El broker desacopla la velocidad de producción del ritmo de consumo
```

---

### Paso 4 — Instanciación de Elementos Arquitectónicos

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SMART ENERGY HUB                              │
│                                                                       │
│  ┌─────────────┐    REST/WS    ┌──────────────────────────────────┐  │
│  │  Frontend   │◄────────────►│         API Gateway              │  │
│  │  React+Vite │              │  Node.js · Puerto 8080           │  │
│  │  Puerto 5173│              └──────────┬───────────────────────┘  │
│  └─────────────┘                         │ HTTP interno              │
│                          ┌───────────────┼────────────────┐          │
│                          ▼               ▼                ▼           │
│                  ┌──────────────┐ ┌───────────┐ ┌─────────────┐     │
│                  │   Ingesta    │ │ Analítica │ │   Alertas   │     │
│                  │  Node·3001   │ │ Node·3002 │ │  Node·3003  │     │
│                  └──────┬───────┘ └─────┬─────┘ └──────┬──────┘     │
│                         │  pub          │ sub           │ sub         │
│                         ▼              ▼               ▼             │
│                  ┌──────────────────────────────────────────────┐    │
│                  │            RabbitMQ (Broker)                  │    │
│                  │  • sensor.data.raw                           │    │
│                  │  • sensor.data.processed                     │    │
│                  │  • alerts.generated                          │    │
│                  └──────────────────────────────────────────────┘    │
│                                         │                             │
│                                         ▼                             │
│                              ┌──────────────────┐                    │
│                              │   MongoDB 7.0     │                    │
│                              │  devices/metrics/ │                    │
│                              │  alerts           │                    │
│                              └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Paso 5 — Asignación de Responsabilidades

| Elemento | Responsabilidad | Driver QAS Satisfecho |
|----------|----------------|-----------------------|
| **Frontend (React+Vite)** | Visualizar métricas, alertas y KPIs en tiempo real | QAS-02 (Rendimiento) |
| **API Gateway (8080)** | Punto de entrada único; enrutamiento, auth JWT futura, WebSocket push | QAS-05 (Seguridad) |
| **Microserv. Ingesta (3001)** | Recibir, validar y publicar lecturas de sensores | QAS-01 (Disponibilidad) |
| **Microserv. Analítica (3002)** | Calcular media móvil y detectar picos de consumo | QAS-02 (Rendimiento) |
| **Microserv. Alertas (3003)** | Persistir, servir y gestionar alertas con CRUD | QAS-04 (Mantenibilidad) |
| **RabbitMQ** | Buffer persistente + desacoplamiento temporal entre servicios | QAS-01 (Disponibilidad) |
| **MongoDB** | Persistencia de métricas históricas, dispositivos y alertas | QAS-03 (Escalabilidad) |
| **Simulador** | Generar lecturas gaussianas configurables para pruebas | RF1 (funcional) |

### Paso 6 — Verificación de Drivers QAS-01 y QAS-03

| Driver | ¿Satisfecho? | Evidencia |
|--------|-------------|-----------|
| QAS-01: Disponibilidad | ✅ Sí | RabbitMQ bufferea mensajes si Analítica cae; Ingesta no se bloquea |
| QAS-03: Escalabilidad | ✅ Sí | Cada microservicio puede replicarse en Docker Compose de forma independiente |

---

## 5. Iteración 2 — Refinamiento del Flujo de Eventos

### Objetivo de la Iteración
> Definir el mecanismo de comunicación entre microservicios para satisfacer **QAS-01 (Disponibilidad)** y **QAS-02 (Rendimiento)** en el flujo de datos de sensores a dashboard.

---

### Paso 3 — Concepto de Diseño Elegido: **Publisher/Subscriber con RabbitMQ**

#### Tácticas de disponibilidad aplicadas en esta iteración

```
Tácticas de Disponibilidad (clasificación SEI)
├── Detección de Fallos
│   └── ✅ Health Check — endpoint /health en cada microservicio
├── Recuperación de Fallos
│   ├── ✅ Redundancia Pasiva — RabbitMQ como buffer persistente
│   ├── ✅ Retry con Acknowledgement — AMQP ACK/NACK
│   └── ✅ Dead Letter Queue — mensajes no procesables → DLQ
└── Prevención de Fallos
    └── ✅ Desacoplamiento temporal — Pub/Sub entre productores y consumidores
```

#### Táctica Principal: Redundancia Pasiva mediante Buffer

```
TÁCTICA: Redundancy — Passive Redundancy (Message Buffer)

ESTÍMULO (QAS-01):    Analítica (3002) cae inesperadamente
                              ↓
RESPUESTA SIN TÁCTICA: Ingesta no puede enviar; datos se pierden
                              ↓
RESPUESTA CON TÁCTICA:
  ① Ingesta publica mensaje en cola → RabbitMQ lo persiste en disco
  ② Cola acumula mensajes: [msg1][msg2][msg3]...
  ③ Analítica se recupera (proceso se reinicia automáticamente)
  ④ Analítica consume todos los mensajes pendientes en orden
  ⑤ 0% pérdida de datos ✅
```

---

### Paso 4 — Instanciación del Patrón Pub/Sub

#### Colas y sus contratos

| Cola | Productor | Consumidor | Persistencia | Tipo |
|------|-----------|------------|--------------|------|
| `sensor.data.raw` | Ingesta (3001) | Analítica (3002) | Sí (durable) | Direct |
| `sensor.data.processed` | Analítica (3002) | Futuros servicios | Sí (durable) | Fanout |
| `alerts.generated` | Analítica (3002) | Alertas (3003) | Sí (durable) | Direct |
| `*.dlq` (Dead Letters) | RabbitMQ interno | Operador manual | Sí | DLQ |

#### Flujo completo instanciado

```
 ① Simulador → POST /api/ingest/batch
        ↓
 ② [Ingesta-3001]
        → Valida schema de la lectura
        → Persiste en MongoDB (colección: metrics)
        → publish(sensor.data.raw, payload)  ← AMQP
        ↓
 ③ [RabbitMQ]
        → Persiste mensaje en cola (durable=true)
        → Espera ACK del consumidor
        ↓ consume (cuando Analítica disponible)
 ④ [Analítica-3002]
        → consume(sensor.data.raw)
        → actualiza historial circular (ventana 20)
        → calcula avg = Σ(historial) / 20
        → si wattage > avg × 2.5 → PICO
        → publish(alerts.generated, alerta)
        → ACK al broker  ← confirma procesamiento exitoso
        ↓
 ⑤ [Alertas-3003]
        → consume(alerts.generated)
        → persiste alerta en MongoDB (colección: alerts)
        → ACK al broker
        ↓
 ⑥ [API Gateway-8080]
        → polling cada 3-5s a Alertas y Analítica
        → push via WebSocket a todos los clientes conectados
        ↓
 ⑦ [Frontend-5173]
        → recibe mensaje WS
        → actualiza KPIs, gráficas y lista de alertas
        → latencia total: < 5s (objetivo: < 2s en producción con WS directo)
```

---

### Paso 5 — Interfaces Definidas

#### API REST del Sistema (API Gateway como fachada única)

| Endpoint | Método | Servicio Destino | QAS Relacionado |
|----------|--------|-----------------|-----------------|
| `/api/ingest` | POST | Ingesta (3001) | QAS-02 Rendimiento |
| `/api/ingest/batch` | POST | Ingesta (3001) | QAS-02 Rendimiento |
| `/api/metrics/latest` | GET | Ingesta (3001) | QAS-02 Rendimiento |
| `/api/metrics/:id` | GET | Ingesta (3001) | QAS-02 Rendimiento |
| `/api/analytics/summary` | GET | Analítica (3002) | QAS-02 Rendimiento |
| `/api/analytics/global` | GET | Analítica (3002) | QAS-02 Rendimiento |
| `/api/alerts` | GET | Alertas (3003) | QAS-04 Mantenibilidad |
| `/api/alerts/unread-count` | GET | Alertas (3003) | QAS-04 Mantenibilidad |
| `/api/alerts/:id/read` | PATCH | Alertas (3003) | QAS-04 Mantenibilidad |
| `ws://localhost:8080/ws` | WebSocket | Gateway → Frontend | QAS-02 Rendimiento |

#### Contrato del evento `sensor.data.raw`

```json
{
  "deviceId": "string",
  "deviceName": "string",
  "wattage": "number",
  "voltage": "number",
  "current": "number",
  "timestamp": "ISO8601 string",
  "isSpike": "boolean"
}
```

### Paso 6 — Verificación de QAS-01 y QAS-02

| Driver | ¿Satisfecho? | Evidencia |
|--------|-------------|-----------|
| QAS-01: 0% pérdida si Analítica cae | ✅ Sí | RabbitMQ durable=true + ACK/NACK garantizan no-pérdida |
| QAS-02: Latencia < 2s | ✅ Parcial | Prototipo alcanza < 5s con polling; producción usa WS directo para < 2s |

---

## 6. Iteración 3 — Refinamiento del Acceso Externo y Seguridad

### Objetivo de la Iteración
> Diseñar el punto de entrada del sistema para satisfacer **QAS-05 (Seguridad)** y mantener la **Mantenibilidad (QAS-04)**, anticipando la autenticación JWT del Corte 2.

---

### Paso 3 — Concepto de Diseño Elegido: **API Gateway + Strangler Fig Pattern**

#### Concepto: API Gateway como fachada centralizada

El **API Gateway** concentra todas las responsabilidades transversales:

```
Sin API Gateway:
  Frontend → Ingesta    (3001) directamente
  Frontend → Analítica  (3002) directamente
  Frontend → Alertas    (3003) directamente
  Problema: Auth, rate limiting y logging en cada servicio ❌

Con API Gateway:
  Frontend → API Gateway (8080)
                 ├── Auth JWT (centralizada)
                 ├── Rate Limiting
                 ├── Enrutamiento inteligente
                 └── WebSocket relay
                       ├── → Ingesta  (3001)
                       ├── → Analítica(3002)
                       └── → Alertas  (3003) ✅
```

#### Patrón: Strangler Fig para migración de Auth

Para preparar Firebase Auth sin implementarla aún, se usa **Strangler Fig**: el Gateway tiene el punto de validación JWT preparado, pero en Corte 1 deja pasar todas las solicitudes. En Corte 2, se "estrangula" el flujo no autenticado gradualmente.

```
Corte 1 (actual):
  Request → Gateway → [JWT check: BYPASS] → Microservicio

Corte 2 (planificado):
  Request → Gateway → [JWT check: Firebase Admin SDK]
                              ├── Token válido → Microservicio
                              └── Token inválido → 401 Unauthorized
```

---

### Paso 4 — Instanciación del API Gateway

| Componente | Tecnología | Responsabilidad |
|------------|-----------|-----------------|
| **Router** | Express Router | Enruta `/api/ingest*` a 3001, `/api/analytics*` a 3002, `/api/alerts*` a 3003 |
| **Auth Middleware** | Express Middleware (stub) | Valida JWT (Corte 2: Firebase Admin SDK) |
| **Rate Limiter** | express-rate-limit | Previene abuso del endpoint de ingesta |
| **WS Manager** | ws library | Mantiene conexiones WebSocket con el frontend |
| **Poller** | setInterval(3000ms) | Consulta microservicios y hace push a clientes WS |

### Paso 5 — Interfaces del API Gateway

```
Entrada (desde Frontend):
  HTTP  → http://localhost:8080/api/*
  WS    → ws://localhost:8080/ws

Salida (hacia Microservicios):
  HTTP  → http://localhost:3001/*   (Ingesta)
  HTTP  → http://localhost:3002/*   (Analítica)
  HTTP  → http://localhost:3003/*   (Alertas)

Mensajes WebSocket al Frontend:
  { type: "metrics_update", data: [...] }
  { type: "alert_new", alert: {...} }
  { type: "kpi_update", kpis: {...} }
```

### Paso 6 — Verificación de QAS-04 y QAS-05

| Driver | ¿Satisfecho? | Evidencia |
|--------|-------------|-----------|
| QAS-04: Cambiar Alertas sin afectar Frontend | ✅ Sí | El Frontend solo conoce el Gateway; Alertas es transparente |
| QAS-05: Auth centralizada | ✅ Preparado | Middleware JWT stub en Gateway; activación sin cambio de arquitectura en Corte 2 |

---

## 7. Tabla Consolidada de Decisiones de Diseño ADD

| ID | Iteración | Decisión | Concepto/Táctica | Driver Satisfecho | Trade-off |
|----|-----------|----------|-----------------|-------------------|-----------|
| D1 | 1 | Arquitectura de Microservicios | Microservicios + EDA | QAS-01, QAS-03 | Mayor complejidad operativa ↔ Alta disponibilidad |
| D2 | 1 | Broker de mensajes RabbitMQ | Message Broker | QAS-01 | Latencia eventual ↔ Durabilidad garantizada |
| D3 | 2 | Patrón Pub/Sub para comunicación | Publisher/Subscriber | QAS-01, QAS-02 | Consistencia eventual ↔ Desacoplamiento total |
| D4 | 2 | AMQP ACK + Dead Letter Queue | Redundancia Pasiva | QAS-01 | Overhead de ACK ↔ 0% pérdida de mensajes |
| D5 | 2 | Base de datos MongoDB | Document Store NoSQL | QAS-03 | Sin ACID ↔ Escritura masiva optimizada |
| D6 | 3 | API Gateway como punto único | Gateway Pattern | QAS-04, QAS-05 | Hop adicional ↔ Auth y enrutamiento centralizados |
| D7 | 3 | Strangler Fig para Auth futura | Strangler Fig | QAS-05 | Deuda técnica temporal ↔ Migración sin ruptura |
| D8 | 3 | Polling + WebSocket en Gateway | Push + Pull híbrido | QAS-02 | 3-5s latencia ↔ Simplicidad de implementación |

---

## 8. Verificación Final — Cobertura de QAS

| QAS | Atributo | Drivers Cubiertos | Iteraciones | Estado |
|-----|----------|-------------------|-------------|--------|
| QAS-01 | Disponibilidad | D2, D3, D4 | 1, 2 | ✅ Satisfecho |
| QAS-02 | Rendimiento/Latencia | D1, D3, D8 | 1, 2, 3 | ✅ Parcial (< 5s prototipo; < 2s producción) |
| QAS-03 | Escalabilidad | D1, D5 | 1 | ✅ Satisfecho |
| QAS-04 | Mantenibilidad | D1, D6 | 1, 3 | ✅ Satisfecho |
| QAS-05 | Seguridad | D6, D7 | 3 | ⏳ Preparado — activo en Corte 2 |

---

## 9. Resumen Ejecutivo ADD

```
┌────────────────────────────────────────────────────────────────────┐
│                  RESUMEN ADD — SMART ENERGY HUB                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DRIVER ARQUITECTÓNICO PRINCIPAL:                                   │
│  QAS-01 — DISPONIBILIDAD (99.9% uptime, 0% pérdida de eventos)     │
│                                                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ITERACIÓN 1 — Estructura Global                                    │
│  Concepto: Microservicios + Event-Driven Architecture               │
│  Efecto: Fallos aislados por contenedor; escalado independiente     │
│                                                                      │
│  ITERACIÓN 2 — Comunicación entre Servicios                         │
│  Concepto: Publisher/Subscriber sobre RabbitMQ                      │
│  Táctica: Redundancia Pasiva + ACK + Dead Letter Queue              │
│  Efecto: 0% pérdida de mensajes aunque un servicio falle            │
│                                                                      │
│  ITERACIÓN 3 — Acceso Externo y Seguridad                           │
│  Concepto: API Gateway + Strangler Fig (auth futura)                │
│  Efecto: Auth centralizada; Frontend desacoplado de servicios       │
│                                                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PATRÓN CENTRAL: Publisher/Subscriber (Pub/Sub)                     │
│  TÁCTICA CENTRAL: Redundancia Pasiva mediante Buffer de Mensajes    │
│  TECNOLOGÍA: RabbitMQ 3.12 · AMQP · Durable Queues · DLQ           │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 10. Conclusión

El proceso **ADD** aplicado al Smart Energy Hub produjo una arquitectura en **3 iteraciones**:

1. **Iteración 1** — Definió que los drivers de disponibilidad y escalabilidad exigen **Microservicios + EDA**. Un monolito habría sido más simple, pero incompatible con el requerimiento de tolerancia a fallos parciales.

2. **Iteración 2** — Refinó la comunicación entre microservicios con el patrón **Publisher/Subscriber** sobre RabbitMQ, aplicando la táctica de **Redundancia Pasiva** (buffer de mensajes). Esta es la decisión más impactante del diseño: garantiza que ningún evento de sensor se pierda aunque un servicio falle.

3. **Iteración 3** — Centralizó el acceso externo en un **API Gateway** y preparó la infraestructura de autenticación JWT con el patrón **Strangler Fig**, permitiendo que la seguridad real se active en Corte 2 sin cambiar la arquitectura subyacente.

El resultado es una arquitectura que **nació de los atributos de calidad**, no de la tecnología. Cada componente existe porque un QAS lo requirió, y cada trade-off fue una decisión consciente documentada en los ADRs del proyecto.

---

*Documento de análisis elaborado para el Corte 1 — Arquitectura y Diseño de Software*  
*UNISANGIL · Ingeniería de Sistemas · Abril 2026*  
*Equipo: Hayder Fino · Jesús Hernández · Sebastián Castillo*
