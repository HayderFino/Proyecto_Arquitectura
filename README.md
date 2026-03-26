# ⚡ Smart Energy Hub
### Corte 1 — Arquitectura y Diseño de Software

> **Institución:** UNISANGIL — Ingeniería de Sistemas  
> **Asignatura:** Arquitectura y Diseño de Software  
> **Fecha:** Marzo 2026  
> **Equipo de desarrollo:**
> | Nombre | Rol |
> |--------|-----|
> Hayder Fino | Líder técnico / Arquitecto |
> Jesús Hernández | Desarrollador Backend |
> Sebastián Castillo | Desarrollador Frontend |

---

## 📋 Tabla de Contenido

1. [Documento de Contexto](#1-documento-de-contexto)
2. [C4 Model — Context](#2-c4-model--contexto)
3. [C4 Model — Containers](#3-c4-model--contenedores)
4. [Propuesta Arquitectónica](#4-propuesta-arquitectónica)
5. [ADRs — Architecture Decision Records](#5-adrs--architecture-decision-records)
6. [Prototipo Funcional](#6-prototipo-funcional)

---

## 1. Documento de Contexto

### 1.1 Descripción del Problema

Los usuarios residenciales y pequeñas empresas no cuentan con herramientas que les permitan visualizar el consumo energético **por dispositivo individual** de forma sencilla. Esta falta de visibilidad genera:

- **Desperdicio energético** por falta de información oportuna
- **Altos costos operativos** que podrían reducirse con acciones correctivas simples
- **Imposibilidad de identificar** qué dispositivo consume más y cuándo
- **Ausencia de alertas tempranas** ante picos de consumo anómalos

### 1.2 Solución Propuesta

**Smart Energy Hub** es una plataforma web de monitoreo energético en tiempo real que:

- Recibe datos de sensores simulados por dispositivo
- Detecta automáticamente picos y patrones de alto consumo
- Genera alertas clasificadas por severidad (Low / Medium / High / Critical)
- Presenta un dashboard interactivo y responsive accesible desde cualquier dispositivo

### 1.3 Objetivos del Sistema

| Objetivo | Descripción |
|----------|-------------|
| **O1** | Diseñar una arquitectura escalable capaz de recibir datos de múltiples sensores de forma concurrente |
| **O2** | Implementar analítica básica para detectar picos de consumo usando media móvil |
| **O3** | Ofrecer un panel web de monitoreo con métricas y alertas en tiempo real |
| **O4** | Garantizar baja latencia (< 2s) en la visualización de nuevos datos |

### 1.4 Stakeholders

| Rol | Necesidades |
|-----|-------------|
| **Usuario Final** | Visualizar su consumo por dispositivo, recibir alertas de picos |
| **Administrador** | Gestionar dispositivos registrados y configurar umbrales |
| **Operador Energético** *(futuro)* | Supervisión avanzada de múltiples sedes |

### 1.5 Alcance

#### ✅ Incluido en este corte:
- Recepción de datos de sensores simulados vía HTTP
- Almacenamiento histórico de métricas por dispositivo en memoria (prototipo) / MongoDB (producción)
- Detección de picos de consumo con algoritmo de media móvil (ventana de 20 lecturas)
- Generación de alertas clasificadas por severidad
- Dashboard web interactivo con gráficas en tiempo real
- Comunicación en tiempo real vía WebSocket

#### ❌ Fuera del alcance (Corte 1):
- Integración con hardware real de sensores
- Facturación energética
- Control remoto de dispositivos
- Autenticación con Firebase (planificado para Corte 2)
- Notificaciones push/email

### 1.6 Requerimientos Funcionales

| ID | Descripción | Estado |
|----|-------------|--------|
| RF1 | El sistema recibirá datos energéticos en tiempo real desde sensores simulados | ✅ Implementado |
| RF2 | El sistema almacenará métricas históricas por dispositivo | ✅ Implementado |
| RF3 | El sistema detectará picos y patrones de consumo elevado | ✅ Implementado |
| RF4 | El sistema generará y mostrará alertas clasificadas al usuario | ✅ Implementado |
| RF5 | El sistema mostrará un dashboard web interactivo con gráficas | ✅ Implementado |
| RF6 | El sistema permitirá autenticación con Google vía Firebase | ⏳ Corte 2 |

### 1.7 Requerimientos No Funcionales

| Atributo | Descripción | Métrica |
|----------|-------------|---------|
| **Alta Disponibilidad** | Sistema operativo 24/7 | 99.9% uptime |
| **Baja Latencia** | Datos reflejados en dashboard | < 2 segundos |
| **Escalabilidad Horizontal** | Soportar más sensores sin rediseño | Vía microservicios + broker |
| **Procesamiento Asíncrono** | Eventos procesados sin bloquear el sistema | Event-Driven con RabbitMQ |
| **Mantenibilidad** | Código modular, servicios independientes | Microservicios desacoplados |
| **Responsividad** | Funcional en móvil y desktop | Mobile-first CSS |

---

## 2. C4 Model — Contexto

> El **Nivel 1 del modelo C4** muestra el sistema como una caja negra y sus relaciones con usuarios y sistemas externos.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTEXTO DEL SISTEMA                      │
└─────────────────────────────────────────────────────────────────┘

           ┌──────────────────┐
           │  Usuario Final   │
           │  (Residente /    │
           │   Empresa)       │
           └────────┬─────────┘
                    │ Visualiza métricas
                    │ y recibe alertas
                    ▼
     ┌──────────────────────────────┐       ┌──────────────────┐
     │                              │◄──────│  Firebase Auth   │
     │     SMART ENERGY HUB        │       │  (Google Login)  │
     │                              │       └──────────────────┘
     │  Plataforma web de           │
     │  monitoreo energético        │       ┌──────────────────┐
     │  por dispositivo en          │◄──────│   Simulador de   │
     │  tiempo real                 │       │    Sensores      │
     │                              │       │  (Scripts Node)  │
     └──────────────────────────────┘       └──────────────────┘
                    │
                    │ Genera alertas
                    ▼
           ┌──────────────────┐
           │  Administrador   │
           │  del Sistema     │
           └──────────────────┘

```

### Descripción de actores externos

| Actor | Tipo | Descripción |
|-------|------|-------------|
| **Usuario Final** | Persona | Monitorea su consumo, navega el dashboard, lee alertas |
| **Administrador** | Persona | Gestiona dispositivos y configuración del sistema |
| **Simulador de Sensores** | Sistema externo | Scripts que generan lecturas simuladas y las envían al sistema |
| **Firebase Auth** | Sistema externo | Proveedor de autenticación OAuth2 con Google |

---

## 3. C4 Model — Contenedores

> El **Nivel 2 del modelo C4** descompone el sistema en sus contenedores principales (aplicaciones, bases de datos, servicios).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SMART ENERGY HUB                                    │
│                                                                              │
│   ┌─────────────────┐          ┌──────────────────────────────────┐          │
│   │  Frontend Web   │          │          API Gateway             │          │
│   │  Dashboard      │◄────────►│  Node.js + Express + WebSocket  │          │
│   │  React + Vite   │  REST/WS │  Puerto: 8080                    │          │
│   │  Puerto: 5173   │          └──────┬───────────────────────────┘          │
│   └─────────────────┘                │                                       │
│                                      │ HTTP interno                          │
│           ┌──────────────────────────┼────────────────────────┐              │
│           ▼                          ▼                         ▼              │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         │
│   │  Microserv.  │         │  Microserv.  │         │  Microserv.  │         │
│   │  Ingesta     │         │  Analítica   │         │  Alertas     │         │
│   │  Node.js     │         │  Node.js     │         │  Node.js     │         │
│   │  Puerto:3001 │         │  Puerto:3002 │         │  Puerto:3003 │         │
│   └──────┬───────┘         └──────┬───────┘         └──────┬───────┘         │
│          │  publica                │ suscribe                │ suscribe        │
│          ▼                         ▼                         ▼                 │
│   ┌─────────────────────────────────────────────────────────┐                 │
│   │               Message Broker — RabbitMQ                  │                 │
│   │  Colas:                                                  │                 │
│   │  • sensor.data.raw       (Ingesta → Analítica)           │                 │
│   │  • sensor.data.processed (Analítica → otros)             │                 │
│   │  • alerts.generated      (Analítica → Alertas)           │                 │
│   └─────────────────────────────────────────────────────────┘                 │
│                                    │                                           │
│                                    ▼                                           │
│                    ┌───────────────────────────────┐                          │
│                    │    Base de Datos NoSQL         │                          │
│                    │    MongoDB / Firestore         │                          │
│                    │  Colecciones:                  │                          │
│                    │  • devices (dispositivos)      │                          │
│                    │  • metrics (historial)         │                          │
│                    │  • alerts  (historial alertas) │                          │
│                    └───────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Descripción de Contenedores

| Contenedor | Tecnología | Puerto | Responsabilidad |
|------------|-----------|--------|-----------------|
| **Frontend Dashboard** | React 18 + Vite + Recharts | 5173 | Visualización de métricas, gráficas, alertas. SPA responsive mobile-first |
| **API Gateway** | Node.js + Express + ws | 8080 | Punto de entrada único. Enrutamiento, auth JWT, rate limiting, WebSocket relay |
| **Microserv. Ingesta** | Node.js + Express | 3001 | Recibe lecturas de sensores, valida, persiste y publica en broker |
| **Microserv. Analítica** | Node.js + Express | 3002 | Consume eventos, calcula media móvil, detecta picos, genera alertas |
| **Microserv. Alertas** | Node.js + Express | 3003 | Consume alertas del broker, persiste y sirve historial con CRUD |
| **Message Broker** | RabbitMQ 3.12 | 5672 | Desacopla productores y consumidores de eventos asíncronos |
| **Base de Datos** | MongoDB 7.0 | 27017 | Persistencia de métricas históricas, dispositivos y alertas |
| **Simulador** | Node.js | — | Genera lecturas gaussianas con picos aleatorios configurables |

### 3.2 Flujo de Datos Detallado

```
 ① Simulador genera lectura (distribución gaussiana + prob. pico 12%)
       ↓ POST /ingest/batch
 ② Ingesta (3001) recibe, valida y guarda en MongoDB
       ↓ publica en RabbitMQ → sensor.data.raw
 ③ Analítica (3002) consume evento
       → actualiza media móvil (ventana 20 lecturas)
       → si wattage > avg × 2.5  → PICO DETECTADO
       → publica en alerts.generated
 ④ Alertas (3003) consume alerta
       → persiste en MongoDB
       → disponible en API REST
 ⑤ API Gateway (8080) hace polling cada 3-5s
       → busca nuevas alertas y métricas
       → hace push a clientes vía WebSocket
 ⑥ Frontend recibe mensaje WS
       → actualiza KPIs, gráficas y lista de alertas en tiempo real
```

---

## 4. Propuesta Arquitectónica

### 4.1 Estilo Arquitectónico Seleccionado

> **Microservicios + Event-Driven Architecture (EDA)**

#### Justificación Técnica

| Criterio | Arquitectura Monolítica | **Microservicios + EDA** ✅ |
|----------|-------------------------|---------------------------|
| Escalabilidad | Escala el sistema completo | **Escala cada servicio independientemente** |
| Tolerancia a fallos | Fallo único afecta todo | **Fallo aislado por contenedor** |
| Despliegue | Todo junto | **Despliegue independiente** |
| Latencia con sensores continuos | Bloquea el hilo | **Procesamiento asíncrono** |
| Mantenibilidad | Código acoplado | **Responsabilidad única por servicio** |

#### ¿Por qué Event-Driven?

Los sensores generan **flujos continuos de eventos** (stream processing). En este patrón:

- **Productores** (Ingesta) publican eventos sin conocer a los consumidores
- **Consumidores** (Analítica, Alertas) procesan de forma independiente y asíncrona
- El **broker** actúa como buffer, garantizando tolerancia a fallos y desacoplamiento

### 4.2 Patrones de Diseño Aplicados

| Patrón | Dónde se aplica | Beneficio |
|--------|-----------------|-----------|
| **API Gateway** | Entrada única al sistema | Rate limiting, auth centralizada, enrutamiento |
| **Publisher/Subscriber** | Ingesta → RabbitMQ → Analítica/Alertas | Desacoplamiento temporal y espacial |
| **Moving Average** | Microservicio Analítica | Detección robusta de picos sin falsos positivos |
| **Polling + WebSocket Push** | API Gateway → Frontend | Tiempo real sin Long Polling costoso |
| **Dead Letter Queue** | RabbitMQ config | Mensajes fallidos no se pierden |
| **Strangler Fig** | Migración a Firebase Auth | Permite reemplazar auth gradualmente |

### 4.3 Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| **Frontend** | React + Vite | 18 / 5 | SPA rápida, HMR, ecosistema maduro |
| **Gráficas** | Recharts | 2.10 | Nativo React, responsive, customizable |
| **API Gateway** | Node.js + Express | 20 / 4 | Ligero, non-blocking I/O, ideal para proxy |
| **Microservicios** | Node.js + Express | 20 / 4 | Consistencia de lenguaje en todo el backend |
| **Message Broker** | RabbitMQ | 3.12 | Más simple que Kafka para prototipo, AMQP estándar |
| **Base de Datos** | MongoDB | 7.0 | Esquema flexible para métricas variables, alta velocidad de escritura |
| **Contenedores** | Docker + Compose | latest | Orquestación local reproducible |
| **Auth (Corte 2)** | Firebase Auth | 10 | Google Login sin fricción, JWT nativo |

### 4.4 Decisiones de Diseño de la API

```
API Gateway — http://localhost:8080

/api/ingest          POST   → Ingesta (3001)  Lectura individual
/api/ingest/batch    POST   → Ingesta (3001)  Lote de lecturas
/api/metrics/latest  GET    → Ingesta (3001)  Última lectura por dispositivo
/api/metrics/:id     GET    → Ingesta (3001)  Historial con filtro tiempo
/api/analytics/summary    GET → Analítica (3002) Resumen estadístico
/api/analytics/global     GET → Analítica (3002) KPIs globales
/api/analytics/timeline/:id GET → Analítica (3002) Timeline de consumo
/api/alerts               GET → Alertas (3003)  Lista paginada + filtros
/api/alerts/unread-count  GET → Alertas (3003)  Contador no leídas
/api/alerts/recent        GET → Alertas (3003)  Últimas 20 alertas
/api/alerts/:id/read      PATCH → Alertas (3003) Marcar como leída
/api/alerts/read-all      PATCH → Alertas (3003) Marcar todas leídas
ws://localhost:8080/ws    WebSocket → Push en tiempo real
```

### 4.5 Algoritmo de Detección de Picos

```
Para cada nueva lectura de wattage W de un dispositivo D:
  1. Agregar W al historial circular (tamaño máx: 20)
  2. Calcular promedio móvil: avg = Σ(historial) / |historial|
  3. Calcular ratio: ratio = W / avg
  4. Si |historial| >= 5 AND ratio > SPIKE_THRESHOLD (2.5):
       → PICO DETECTADO
       → severity = ratio >= 4 ? 'critical'
                  : ratio >= 3 ? 'high'
                  : ratio >= 2 ? 'medium'
                  : 'low'
       → Publicar alerta en broker + persistir en BD
```

### 4.6 Estructura del Proyecto

```
proyecto arquitectura/
├── README.md                       ← Este documento (Corte 1)
│
└── smart-energy-hub/               ← Código fuente del sistema
    ├── docker-compose.yml          ← Orquestación completa (producción)
    ├── mongo-init.js               ← Seeds de BD: colecciones + índices
    │
    ├── frontend/                   ← Contenedor: Frontend SPA
    │   ├── src/
    │   │   ├── App.jsx             ← Shell: sidebar, topbar, WebSocket
    │   │   ├── index.css           ← Design system (dark mode, tokens CSS)
    │   │   ├── hooks/
    │   │   │   └── useWebSocket.js ← Hook WS con auto-reconexión
    │   │   ├── services/
    │   │   │   └── api.js          ← Cliente HTTP centralizado
    │   │   └── pages/
    │   │       ├── Dashboard.jsx   ← KPIs + BarChart + PieChart + Timeline
    │   │       ├── Devices.jsx     ← Cards de dispositivos + modal detalle
    │   │       ├── Alerts.jsx      ← Lista paginada + filtros + marcado
    │   │       └── Settings.jsx    ← Config simulador + arquitectura
    │   ├── nginx.conf              ← Proxy a Gateway + SPA fallback
    │   └── Dockerfile              ← Multi-stage: Vite build → nginx
    │
    ├── services/
    │   ├── api-gateway/            ← Contenedor: API Gateway + WS
    │   │   └── src/index.js
    │   ├── ingesta/                ← Contenedor: Microservicio Ingesta
    │   │   └── src/index.js
    │   ├── analitica/              ← Contenedor: Microservicio Analítica
    │   │   └── src/index.js
    │   └── alertas/                ← Contenedor: Microservicio Alertas
    │       └── src/index.js
    │
    └── simulator/                  ← Simulador de sensores configurable
        └── simulate.js
```

---

## 5. ADRs — Architecture Decision Records

> Los ADRs documentan las decisiones arquitectónicas relevantes tomadas durante el diseño del sistema.

---

### ADR-001: Estilo Arquitectónico — Microservicios + EDA

| Campo | Valor |
|-------|-------|
| **Estado** | ✅ Aceptado |
| **Fecha** | Marzo 2026 |
| **Decisores** | Equipo completo |

**Contexto:**
El sistema debe procesar flujos continuos de datos de sensores, con múltiples funciones independientes (ingesta, analítica, alertas) que podrían escalar de forma diferente.

**Decisión:**
Usar arquitectura de Microservicios combinada con Event-Driven Architecture (EDA) mediante un message broker.

**Consecuencias positivas:**
- Cada servicio escala independientemente según su carga
- Tolerancia a fallos: si Analítica cae, Ingesta sigue recibiendo datos (el broker los bufferea)
- Desacoplamiento: los servicios no se conocen directamente
- Facilita iteración: se puede reemplazar un servicio sin afectar los otros

**Consecuencias negativas:**
- Mayor complejidad operativa respecto a un monolito
- Requiere infraestructura adicional (broker, orquestación)
- Debugging distribuido más complejo

**Alternativas descartadas:**
- *Monolito*: más simple pero no escala por función y un bug afecta todo
- *Serverless*: costoso para flujo continuo, cold starts inadecuados para latencia < 2s

---

### ADR-002: Message Broker — RabbitMQ

| Campo | Valor |
|-------|-------|
| **Estado** | ✅ Aceptado |
| **Fecha** | Marzo 2026 |
| **Decisores** | Hayder Fino, Jesús Hernández |

**Contexto:**
Se necesita un mecanismo de comunicación asíncrona entre microservicios que garantice entrega de mensajes y soporte alto volumen de eventos de sensores.

**Decisión:**
Usar **RabbitMQ 3.12** como message broker con el protocolo AMQP.

**Consecuencias positivas:**
- Curva de aprendizaje menor que Kafka
- UI de administración incluida (puerto 15672)
- Soporte nativo de acknowledgements (garantía de entrega)
- Dead Letter Queues para mensajes fallidos
- Suficiente para el volumen del prototipo (< 1000 msg/s)

**Consecuencias negativas:**
- Menor throughput que Kafka para volúmenes masivos
- Sin log compaction ni replay de mensajes históricos

**Alternativas descartadas:**
- *Apache Kafka*: excesivamente complejo para prototipo; ideal si se escala a miles de sensores reales
- *Redis Pub/Sub*: sin persistencia de mensajes ni acknowledgements

---

### ADR-003: Base de Datos — MongoDB

| Campo | Valor |
|-------|-------|
| **Estado** | ✅ Aceptado |
| **Fecha** | Marzo 2026 |
| **Decisores** | Equipo completo |

**Contexto:**
Se necesita almacenar métricas de sensores (esquema variable), historial de alertas y registro de dispositivos. El patrón de acceso es principalmente escritura intensiva con lecturas por rango de tiempo.

**Decisión:**
Usar **MongoDB 7.0** como base de datos principal con índices en `deviceId + timestamp`.

**Consecuencias positivas:**
- Esquema flexible: ideal para métricas con campos variables
- Alta velocidad de escritura (insertMany optimizado)
- Integración nativa con Mongoose (ODM para Node.js)
- Escalabilidad horizontal con réplicas y sharding
- Consultas de agregación potentes (pipeline) para promedios y picos

**Consecuencias negativas:**
- No adecuado para consultas relacionales complejas
- Sin transacciones ACID multi-documento en versiones antiguas
- Mayor consumo de almacenamiento que BD relacional

**Alternativas descartadas:**
- *Firebase Firestore*: mejor integración con Firebase Auth (planificado Corte 2), pero mayor latencia en consultas complejas y costo por operación
- *PostgreSQL + TimescaleDB*: excelente para series de tiempo pero mayor complejidad de configuración

---

### ADR-004: Simulación de Sensores

| Campo | Valor |
|-------|-------|
| **Estado** | ✅ Aceptado |
| **Fecha** | Marzo 2026 |

**Contexto:**
El proyecto está en fase de prototipo — integrar hardware real de sensores IoT está fuera del alcance del Corte 1.

**Decisión:**
Implementar un **simulador configurable en Node.js** que genera lecturas con distribución gaussiana y probabilidad de pico ajustable.

**Parámetros configurables:**

| Variable | Default | Descripción |
|----------|---------|-------------|
| `SEND_INTERVAL_MS` | 3000 | Frecuencia de envío (ms) |
| `DEVICE_COUNT` | 6 | Número de dispositivos simulados |
| `SPIKE_PROBABILITY` | 0.12 | Probabilidad de pico [0-1] |

**Algoritmo de generación:**
```
wattage_base = gaussiana(μ=base_device, σ=varianza)
isSpike = random() < SPIKE_PROBABILITY
wattage = isSpike
          ? wattage_base × (2.5 + random() × 2)   // pico: 2.5x–4.5x
          : max(10, redondear(wattage_base))
```

**Consecuencias positivas:**
- Permite probar el sistema sin hardware real
- Simula carga realista con distribución estadística
- Configurable para diferentes escenarios de prueba
- Reutilizable como suite de pruebas de carga

**Consecuencias negativas:**
- Los datos no reflejan el comportamiento exacto de sensores reales
- El patrón gaussiano puede suavizar picos reales

---

### ADR-005: Autenticación — Firebase Auth (Planificado)

| Campo | Valor |
|-------|-------|
| **Estado** | ⏳ Propuesto — Corte 2 |
| **Fecha** | Anticipado Abril 2026 |

**Contexto:**
El sistema requiere control de acceso para que cada usuario solo vea sus propios dispositivos y métricas.

**Decisión:**
Usar **Firebase Authentication** con Google OAuth2.

**Flujo planificado:**
```
1. Usuario presiona "Iniciar sesión con Google" en el frontend
2. Firebase SDK abre popup OAuth2 de Google
3. Firebase retorna ID Token (JWT) al frontend
4. Frontend incluye token en header: Authorization: Bearer <token>
5. API Gateway valida el token con Firebase Admin SDK
6. Solicitudes sin token válido reciben 401 Unauthorized
```

**Consecuencias positivas:**
- Sin gestión de contraseñas ni sesiones propias
- Token JWT estándar compatible con cualquier servicio
- Soporte nativo para múltiples proveedores (Google, Facebook, etc.)

**Consecuencias negativas:**
- Dependencia con infraestructura de Google
- Requiere proyecto Firebase configurado

---

## 6. Prototipo Funcional

### 6.1 Estado del Prototipo

El prototipo funcional implementa los Requisitos RF1–RF5 y está operativo localmente.

### 6.2 Capturas del Sistema en Funcionamiento

#### Panel de Control (Dashboard)
- KPIs en tiempo real: lecturas por hora, dispositivos activos, consumo promedio, picos detectados
- Gráfica de barras: consumo promedio vs máximo por dispositivo
- Pie chart: distribución de consumo entre dispositivos
- Timeline: historial de consumo por dispositivo seleccionado

#### Dispositivos
- Tarjetas con consumo actual en watts, estadísticas (máx/mín/promedio)
- Barra de progreso de carga relativa
- Indicador visual de pico activo (borde rojo pulsante)
- Modal con historial detallado de lecturas (tabla con timestamp, W, V, A)

#### Centro de Alertas
- Lista paginada con filtros por severidad (Critical / High / Medium / Low)
- Ordenamiento por fecha o severidad
- KPIs: total, no leídas, críticas, altas
- Marcado individual y masivo de alertas como leídas
- Notificaciones toast en tiempo real para nuevos picos

#### Configuración
- Parámetros del simulador (intervalo, probabilidad pico, cantidad dispositivos)
- Umbral de detección de picos
- Referencia de puertos y servicios del sistema

### 6.3 Instrucciones para Ejecutar el Prototipo

#### Opción A — Con Docker (recomendado para producción)
```bash
# Prerrequisito: Docker Desktop instalado y en ejecución

cd smart-energy-hub
docker compose up --build -d

# Verificar que todos los servicios están activos
docker compose ps

# Ver logs en tiempo real
docker compose logs -f simulator
```

#### Opción B — Local sin Docker (modo desarrollo actual)

```powershell
# Terminal 1 — Microservicio Ingesta
cd smart-energy-hub\services\ingesta
npm install
node src/index.js

# Terminal 2 — Microservicio Analítica
cd smart-energy-hub\services\analitica
npm install
node src/index.js

# Terminal 3 — Microservicio Alertas
cd smart-energy-hub\services\alertas
npm install
node src/index.js

# Terminal 4 — API Gateway
cd smart-energy-hub\services\api-gateway
npm install
node src/index.js

# Terminal 5 — Simulador de Sensores
cd smart-energy-hub\simulator
npm install
node simulate.js

# Terminal 6 — Frontend
cd smart-energy-hub\frontend
npm install
npm run dev
```

#### URLs de acceso

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend Dashboard** | http://localhost:5173 | Interfaz principal del sistema |
| **API Gateway** | http://localhost:8080 | Punto de entrada REST + WebSocket |
| **RabbitMQ UI** | http://localhost:15672 | Panel de administración del broker |
| Ingesta API | http://localhost:3001/health | Health check del microservicio |
| Analítica API | http://localhost:3002/health | Health check del microservicio |
| Alertas API | http://localhost:3003/health | Health check del microservicio |

### 6.4 Métricas del Prototipo en Funcionamiento

Sobre una ejecución de ~15 minutos con configuración por defecto:

| Métrica | Valor |
|---------|-------|
| Lecturas generadas | ~300 lecturas (6 devices × 50 ciclos) |
| Picos detectados | ~35–40 (aprox. 12% del total) |
| Alertas generadas | ~35–40 alertas clasificadas |
| Latencia API → Dashboard | < 5 segundos (polling WS) |
| Dispositivos simulados | 6 (Aire A/C, Refrigerador, Lavadora, PC, TV, Microondas) |

### 6.5 Tecnologías del Prototipo — Confirmadas y Funcionando

| Tecnología | Versión | Rol | Estado |
|-----------|---------|-----|--------|
| React + Vite | 18 / 5 | Frontend SPA | ✅ Activo |
| Recharts | 2.10 | Gráficas | ✅ Activo |
| Node.js | 20 LTS | Backend (todos los servicios) | ✅ Activo |
| Express | 4.18 | Framework HTTP | ✅ Activo |
| ws (WebSocket) | 8.16 | Tiempo real | ✅ Activo |
| Almacenamiento en memoria | — | Sustituto MongoDB en prototipo | ✅ Activo |
| RabbitMQ | 3.12 | Broker (requerido con Docker) | ⏳ Docker |
| MongoDB | 7.0 | Persistencia (requerido con Docker) | ⏳ Docker |

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Alto volumen de datos de sensores | Media | Alto | Broker con colas persistentes + escalado horizontal |
| Pérdida de eventos en el broker | Baja | Alto | Acknowledgements en RabbitMQ + Dead Letter Queues |
| Inconsistencia temporal en alertas | Media | Medio | Timestamps ISO8601 en cada evento; idempotencia |
| Complejidad de orquestación local | Alta | Bajo | Docker Compose simplifica el setup en 1 comando |
| Prototipo sin autenticación | Alta | Medio | Planificado para Corte 2 con Firebase Auth |

---

## 8. Trabajo Futuro — Corte 2

- [ ] **Firebase Auth** — Google Login integrado en el frontend + validación JWT en API Gateway
- [ ] **Persistencia real** — Migrar de memoria a MongoDB + configuración de réplicas
- [ ] **Usuario multi-tenant** — Cada usuario ve solo sus dispositivos
- [ ] **Registro de dispositivos** — CRUD de dispositivos desde la UI
- [ ] **Notificaciones push** — Firebase Cloud Messaging para alertas en móvil
- [ ] **Exportar reportes** — Descarga CSV/PDF del historial de consumo
- [ ] **Despliegue en nube** — CI/CD con GitHub Actions + deploy en Railway o Render

---

*Documento elaborado para el Corte 1 — Taller de Arquitectura y Diseño de Software*  
*UNISANGIL · Ingeniería de Sistemas · Marzo 2026*  
*Equipo: Hayder Fino · Jesús Hernández · Sebastián Castillo*
