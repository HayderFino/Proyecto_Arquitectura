# 🏛️ Análisis ATAM — Smart Energy Hub
### Architecture Tradeoff Analysis Method

> **Proyecto:** Smart Energy Hub — Plataforma de Monitoreo Energético en Tiempo Real  
> **Equipo:** Hayder Fino · Jesús Hernández · Sebastián Castillo  
> **Institución:** UNISANGIL — Ingeniería de Sistemas  
> **Asignatura:** Arquitectura y Diseño de Software · Corte 1 · Marzo 2026  

---

## 1. ¿Qué es ATAM?

El **Architecture Tradeoff Analysis Method (ATAM)** es un método de evaluación arquitectónica desarrollado por el SEI (Software Engineering Institute) de Carnegie Mellon University. Su objetivo es identificar:

- Los **atributos de calidad** que el sistema debe satisfacer
- Los **puntos de sensibilidad** (decisiones que afectan un atributo)
- Los **tradeoffs** (decisiones que favorecen un atributo a costa de otro)
- Los **riesgos** arquitectónicos asociados

---

## 2. Árbol de Utilidad — Atributos de Calidad del Sistema

El árbol de utilidad prioriza los atributos de calidad según su importancia para los stakeholders del sistema.

```
UTILIDAD DEL SISTEMA
│
├── 🔴 DISPONIBILIDAD (H, H)        ← CRÍTICO
│   ├── Operación 24/7 sin interrupciones
│   └── Tolerancia a fallos en microservicios individuales
│
├── 🟠 RENDIMIENTO / LATENCIA (H, M)
│   ├── Latencia < 2 segundos en dashboard
│   └── Procesamiento asíncrono sin bloqueo
│
├── 🟡 ESCALABILIDAD (H, M)
│   ├── Soporte para más sensores sin rediseño
│   └── Escalado independiente por servicio
│
├── 🟢 MANTENIBILIDAD (M, H)
│   ├── Servicios independientes y desacoplados
│   └── Reemplazo de un servicio sin afectar los demás
│
├── 🔵 SEGURIDAD (M, M)
│   └── Autenticación JWT por API Gateway (planificado Corte 2)
│
└── 🟣 USABILIDAD (M, L)
    └── Dashboard responsive mobile-first

Leyenda: (Importancia para negocio, Dificultad técnica)
H = Alta · M = Media · L = Baja
```

---

## 3. 🎯 Atributo de Calidad Más Importante: **DISPONIBILIDAD**

### 3.1 Justificación

La **Disponibilidad** es el atributo de calidad más crítico del Smart Energy Hub por las siguientes razones documentadas en el sistema:

| Evidencia en el Proyecto | Sustento |
|--------------------------|----------|
| RNF: *"Sistema operativo 24/7"* con **99.9% uptime** | Los usuarios dependen del dashboard para reaccionar ante picos en tiempo real |
| RNF: *"Datos reflejados en dashboard < 2 segundos"* | Un sistema caído impide detectar picos de consumo críticos con consecuencias económicas |
| ADR-001: *"Si Analítica cae, Ingesta sigue recibiendo datos"* | La arquitectura fue diseñada explícitamente para tolerar fallos parciales |
| ADR-002: *"Acknowledgements + Dead Letter Queues"* | Se garantiza la no pérdida de eventos aunque un servicio falle temporalmente |
| Riesgo documentado: *"Pérdida de eventos — Impacto ALTO"* | El equipo identificó la disponibilidad como el riesgo de mayor impacto |

### 3.2 Escenario ATAM para Disponibilidad

| Campo | Descripción |
|-------|-------------|
| **Fuente del estímulo** | Fallo repentino del Microservicio de Analítica (crash / sobrecarga) |
| **Estímulo** | El servicio de Analítica deja de responder a mensajes del broker |
| **Artefacto afectado** | Microservicio Analítica (puerto 3002) + cola `sensor.data.raw` |
| **Entorno** | Sistema en producción bajo carga normal (300 lecturas/15 min) |
| **Respuesta esperada** | El sistema continúa recibiendo y almacenando datos de sensores sin pérdida |
| **Medida de respuesta** | 0% pérdida de lecturas; Analítica se recupera en < 30 segundos sin intervención |

---

## 4. 🔧 Táctica Arquitectónica Aplicada: **Redundancia mediante Message Broker (Buffering de Mensajes)**

### 4.1 Categoría de la Táctica

> **Categoría:** Tácticas de Disponibilidad → **Recuperación de Fallos** → *Redundancia Pasiva con Buffer*

Las tácticas de disponibilidad del modelo SEI se dividen en tres grupos:

```
Tácticas de Disponibilidad
├── Detección de Fallos
│   ├── Heartbeat / Ping-Echo
│   └── Monitor
├── Recuperación de Fallos  ← ✅ APLICADA
│   ├── Votación
│   ├── Redundancia Activa
│   └── Redundancia Pasiva (Spare / Buffer) ← ✅ RabbitMQ actúa como buffer
└── Prevención de Fallos
    ├── Remoción de Servicio
    └── Transacciones
```

### 4.2 Cómo se Aplica la Táctica en el Sistema

```
  ① Sensor genera evento de consumo
         ↓ POST /ingest/batch
  ② Microserv. Ingesta (3001)
         → Valida y persiste en memoria/MongoDB ✅
         → Publica en RabbitMQ: cola sensor.data.raw ✅
         ↓
  ③ RabbitMQ actúa como BUFFER PERSISTENTE
     ┌─────────────────────────────────────┐
     │  sensor.data.raw  [msg1][msg2]...   │ ← mensajes esperan aquí
     │                                     │   aunque Analítica esté caída
     └─────────────────────────────────────┘
         ↓  cuando Analítica se recupera
  ④ Microserv. Analítica (3002)
         → Consume mensajes acumulados (sin pérdida)
         → Calcula media móvil y detecta picos
         → Publica alertas en alerts.generated
         ↓
  ⑤ Dead Letter Queue (DLQ)
         → Si un mensaje falla múltiples veces
         → Se mueve a DLQ para inspección manual
         → NO se pierde el evento
```

### 4.3 Tácticas Complementarias Aplicadas

| Táctica | Implementación en el Sistema | Efecto sobre Disponibilidad |
|---------|-----------------------------|-----------------------------|
| **Message Queuing (Buffer)** | RabbitMQ con colas persistentes | Absorbe fallos temporales de consumidores |
| **Dead Letter Queue** | Configuración en RabbitMQ | Ningún mensaje se pierde aunque falle procesamiento |
| **Acknowledgements explícitos** | AMQP ACK/NACK en consumidores | El broker reencola si el consumidor no confirma |
| **Desacoplamiento temporal** | Pub/Sub entre microservicios | Un servicio caído no bloquea a los demás |
| **Health Check** | `/health` endpoint en cada microservicio | Permite detectar fallos automáticamente |
| **Polling con reconexión** | API Gateway hace polling cada 3-5s | Recupera datos acumulados tras breve interrupción |

---

## 5. 🏗️ Patrón Arquitectónico Utilizado: **Publisher/Subscriber (Pub/Sub) sobre Event-Driven Architecture**

### 5.1 Descripción del Patrón

El patrón **Publisher/Subscriber** desacopla a los productores de información (publishers) de los consumidores (subscribers) a través de un canal intermedio (broker). Ningún componente conoce la existencia directa del otro.

```
                    ┌─────────────────────────────────────┐
                    │         MESSAGE BROKER               │
                    │           (RabbitMQ)                 │
                    │                                      │
 ┌──────────┐  pub  │  ┌──────────────────────────────┐   │  sub  ┌─────────────┐
 │ Ingesta  │──────►│  │  Cola: sensor.data.raw       │   │──────►│  Analítica  │
 │  (3001)  │       │  └──────────────────────────────┘   │       │   (3002)    │
 └──────────┘       │                                      │       └─────────────┘
                    │  ┌──────────────────────────────┐   │  sub  ┌─────────────┐
                    │  │  Cola: alerts.generated      │   │──────►│   Alertas   │
                    │  └──────────────────────────────┘   │       │   (3003)    │
                    │                                      │       └─────────────┘
                    └─────────────────────────────────────┘
```

### 5.2 Por Qué Este Patrón es el Más Adecuado

| Alternativa | Problema | Por qué Pub/Sub gana |
|-------------|----------|----------------------|
| **REST síncrono entre microservicios** | Si Analítica está caída, Ingesta falla en cascada | Pub/Sub desacopla: Ingesta nunca llama directamente a Analítica |
| **Monolito con llamadas directas** | Un bug en el módulo de alertas detiene todo el flujo | Con Pub/Sub, cada consumidor falla de forma independiente |
| **Redis Pub/Sub** | Sin persistencia: si Analítica cae, los mensajes se pierden | RabbitMQ persiste mensajes hasta confirmación de recepción |
| **Apache Kafka** | Complejidad operativa excesiva para el volumen del prototipo | RabbitMQ es suficiente para < 1000 msg/s con menor overhead |

### 5.3 Propiedades del Patrón que Soportan la Disponibilidad

```
Pub/Sub + RabbitMQ → Disponibilidad: 99.9%

Desacoplamiento Espacial:
  → Ingesta NO necesita saber que Analítica existe
  → Si Analítica se cae, Ingesta continúa publicando sin error

Desacoplamiento Temporal:
  → Los mensajes esperan en la cola hasta que el consumidor está listo
  → Analítica puede reiniciarse y procesar mensajes pendientes

Desacoplamiento de Protocolo:
  → Ambos servicios hablan con RabbitMQ via AMQP
  → Cada uno puede evolucionar independientemente
```

### 5.4 Instancias del Patrón en el Código del Sistema

| Cola RabbitMQ | Publisher | Subscriber(s) | Propósito |
|---------------|-----------|----------------|-----------|
| `sensor.data.raw` | Ingesta (3001) | Analítica (3002) | Transmitir lecturas de sensores para análisis |
| `sensor.data.processed` | Analítica (3002) | Múltiples futuros consumers | Datos enriquecidos para consumo general |
| `alerts.generated` | Analítica (3002) | Alertas (3003) | Transmitir alertas para persistencia y servicio |

---

## 6. Trade-offs Identificados (Puntos de Tensión Arquitectónica)

Un análisis ATAM completo documenta los **trade-offs**: decisiones que benefician un atributo a costa de otro.

| Decisión Arquitectónica | Atributo Beneficiado | Atributo Penalizado | Trade-off |
|-------------------------|----------------------|---------------------|-----------|
| Microservicios en lugar de monolito | ✅ Disponibilidad, Escalabilidad | ❌ Mantenibilidad operativa (debugging distribuido) | Aceptado: el debugging complejo se mitiga con Docker Compose |
| RabbitMQ como broker asíncrono | ✅ Disponibilidad, Rendimiento | ❌ Consistencia eventual (no hay transacciones distribuidas) | Aceptado: alertas de energía no requieren consistencia fuerte |
| Polling Gateway (3-5s) vs WebSocket puro | ✅ Mantenibilidad, Simplicidad | ❌ Latencia real (5s vs <1s) | Aceptado: 5s es aceptable para monitoreo energético |
| MongoDB sobre PostgreSQL | ✅ Escalabilidad, Flexibilidad de esquema | ❌ Consistencia ACID, Consultas relacionales | Aceptado: datos de sensores son en su mayoría append-only |
| Almacenamiento en memoria (prototipo) | ✅ Simplicidad de dev, Velocidad | ❌ Durabilidad (datos se pierden al reiniciar) | Aceptado para Corte 1; MongoDB en Corte 2 |

---

## 7. Puntos de Sensibilidad y Riesgos

### 7.1 Puntos de Sensibilidad
> Decisiones que afectan directamente un atributo de calidad específico.

| Punto de Sensibilidad | Atributo Afectado | Impacto |
|-----------------------|-------------------|---------|
| `SPIKE_THRESHOLD = 2.5` en Analítica | Usabilidad / Precisión | Demasiado bajo → falsos positivos; demasiado alto → picos no detectados |
| `SEND_INTERVAL_MS = 3000` en Simulador | Rendimiento / Latencia percibida | Interval corto → más carga en broker y BD |
| Tamaño de ventana móvil = 20 lecturas | Precisión de detección | Ventana pequeña → más ruido; grande → retraso en detección |
| Polling del Gateway cada 3-5s | Latencia end-to-end | Define el tiempo mínimo de respuesta visible al usuario |

### 7.2 Riesgos Arquitectónicos

| Riesgo | Probabilidad | Impacto sobre Disponibilidad | Mitigación |
|--------|-------------|------------------------------|------------|
| RabbitMQ se convierte en SPOF (punto único de fallo) | Media | **MUY ALTO** | Configurar RabbitMQ en cluster (HA) en producción |
| Crecimiento no controlado de colas (backpressure) | Media | Alto | Dead Letter Queue + límite de mensajes por cola |
| Reinicio del prototipo borra historial en memoria | Alta | Medio | Migrar a MongoDB (Corte 2) |
| Sin autenticación activa → acceso no autorizado | Alta | Medio | Firebase Auth planificado para Corte 2 |

---

## 8. Resumen Ejecutivo ATAM

```
┌────────────────────────────────────────────────────────────────┐
│              RESUMEN ATAM — SMART ENERGY HUB                   │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ATRIBUTO MÁS IMPORTANTE:  DISPONIBILIDAD (99.9% uptime)       │
│                                                                  │
│  Razón: Sistema 24/7 de monitoreo energético crítico.           │
│  Un fallo implica pérdida de datos de sensores y alertas        │
│  no entregadas, con consecuencias económicas directas.          │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TÁCTICA APLICADA:  Redundancia Pasiva mediante Buffer          │
│                     (Message Broker con cola persistente)        │
│                                                                  │
│  Implementación: RabbitMQ con AMQP ACK + Dead Letter Queue      │
│  Efecto: Ningún mensaje se pierde aunque un servicio falle.     │
│          Los consumidores pueden reiniciarse sin pérdida.        │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PATRÓN ARQUITECTÓNICO:  Publisher/Subscriber (Pub/Sub)         │
│                           sobre Event-Driven Architecture        │
│                                                                  │
│  Implementación: Ingesta → RabbitMQ → Analítica/Alertas         │
│  Efecto: Desacoplamiento total entre productores y              │
│          consumidores. Fallo aislado por servicio.               │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. Conclusión

El análisis ATAM del **Smart Energy Hub** revela que la **Disponibilidad** es el atributo de calidad dominante, ya que el sistema opera en modo crítico 24/7 y cualquier interrupción impide a usuarios residenciales y empresas detectar picos de consumo energético con consecuencias económicas directas.

La decisión arquitectónica más acertada del equipo fue adoptar el patrón **Publisher/Subscriber** sobre una **Event-Driven Architecture** con **RabbitMQ como broker**, aplicando la táctica de **redundancia mediante buffer de mensajes persistente**. Esta combinación garantiza que:

1. **Ningún evento de sensor se pierde** aunque un microservicio falle temporalmente
2. **Los servicios escalan de forma independiente** según la carga de cada función
3. **El fallo de un componente no propaga cascadas** al resto del sistema
4. **La recuperación es automática** — al reiniciarse un servicio, procesa los mensajes pendientes en cola

El principal **trade-off aceptado** es la mayor complejidad operativa (debugging distribuido, infraestructura de broker), que el equipo mitiga con Docker Compose para orquestación reproducible en un solo comando.

---

*Documento de análisis elaborado para el Corte 1 — Arquitectura y Diseño de Software*  
*UNISANGIL · Ingeniería de Sistemas · Abril 2026*  
*Equipo: Hayder Fino · Jesús Hernández · Sebastián Castillo*
