# Smart Energy Hub — Documentación General del Proyecto Final (Fase 1 y Fase 2)

> **Proyecto:** Smart Energy Hub  
> **Curso:** Arquitectura y Diseño de Software  
> **Versión del documento:** 1.0  
> **Fecha:** 27 de marzo de 2026

---

## 1) Fase 1 — Planteamiento del problema y contexto

### 1.1 Nombre del sistema
**Smart Energy Hub**: plataforma web para monitoreo de consumo energético por dispositivo, basada en sensores simulados y analítica de eventos en tiempo real.

### 1.2 Actores involucrados

| Actor | Tipo | Rol en el sistema |
|---|---|---|
| Usuario final | Humano | Consulta consumo por dispositivo, revisa alertas, analiza tendencias. |
| Administrador del sistema | Humano | Configura parámetros, umbrales, dispositivos y supervisa el estado general. |
| Operador energético (futuro) | Humano | Consolida indicadores para múltiples sedes y genera reportes avanzados. |
| Simulador de sensores | Sistema externo | Emite lecturas de consumo energético para pruebas y validación funcional. |
| Servicio de autenticación (Firebase Auth) | Sistema externo | Gestiona autenticación con Google para acceso seguro. |
| Servicio de notificaciones (futuro) | Sistema externo | Entrega alertas por canales externos (correo, push, etc.). |

### 1.3 Necesidades del sistema

1. **Visibilidad por dispositivo:** identificar claramente qué equipo consume más energía y en qué momentos.
2. **Monitoreo en tiempo real:** disponer de datos recientes con baja latencia para toma de decisiones.
3. **Detección temprana de picos:** reconocer patrones de alto consumo para actuar oportunamente.
4. **Trazabilidad histórica:** conservar métricas para análisis comparativos diarios/semanales/mensuales.
5. **Alertamiento útil:** notificar eventos relevantes con severidad y contexto.
6. **Escalabilidad:** soportar incremento gradual de sensores sin rediseño completo.

### 1.4 Contexto de uso

Smart Energy Hub se usa principalmente en entornos residenciales, comerciales pequeños o laboratorios académicos donde se requiere entender el comportamiento energético por dispositivo.

- El usuario ingresa al **dashboard web**.
- El sistema recibe eventos desde un **simulador de sensores**.
- La plataforma procesa datos y calcula indicadores de consumo.
- Si se detectan umbrales críticos o anomalías, se generan alertas.
- El usuario visualiza gráficas, estado de dispositivos e historial de alertas.

### 1.5 Alcance del proyecto

#### Incluye (Fase 1 y base funcional)
- Recepción de datos de sensores simulados.
- Almacenamiento histórico de métricas energéticas.
- Analítica básica para detección de picos de consumo.
- Generación y consulta de alertas.
- Dashboard web para visualización de métricas.
- Modelo arquitectónico C4 (Contexto y Contenedores).
- Registro de decisiones de arquitectura (ADRs).

#### No incluye (en esta entrega)
- Integración con hardware físico real.
- Facturación energética.
- Control remoto/automatización de dispositivos IoT.
- Motor de predicción avanzada con IA (más allá de analítica básica).

### 1.6 Limitaciones identificadas

1. **Dependencia de datos simulados:** no representa al 100% ruido y variabilidad del mundo real.
2. **Riesgo de pérdida de eventos:** si no se configuran adecuadamente persistencia/reintentos del broker.
3. **Inconsistencia temporal:** posibles desfases entre recepción, procesamiento y visualización.
4. **Cobertura funcional parcial:** autenticación completa y notificaciones externas pueden quedar para iteraciones siguientes.
5. **Costo/operación en producción:** escalado y observabilidad requieren diseño DevOps adicional.

---

## 2) Fase 2 — Estilos arquitectónicos y patrones

### 2.1 Estilo arquitectónico seleccionado

Se adopta una **arquitectura de microservicios orientada a eventos (Event-Driven Architecture, EDA)**, con un **API Gateway** como punto de entrada y un **Message Broker** para comunicación asíncrona.

### 2.2 Justificación del estilo elegido

- Permite **desacoplar** productores y consumidores de eventos energéticos.
- Facilita **escalado horizontal por servicio** según carga (ingesta, analítica, alertas).
- Mejora la **resiliencia operativa**: fallas en un componente no detienen todo el sistema.
- Optimiza el **procesamiento near real-time** para métricas y alertas.
- Encaja con la naturaleza del problema: flujo continuo de datos de sensores.

### 2.3 Patrones arquitectónicos aplicables

1. **API Gateway Pattern**
   - Entrada única para frontend y clientes externos.
   - Centraliza rutas, seguridad, CORS, límites y observabilidad.

2. **Publish/Subscribe (Pub/Sub)**
   - Ingesta publica eventos; analítica y alertas se suscriben según tipo.
   - Reduce acoplamiento temporal y estructural.

3. **Microservices Decomposition**
   - División en dominios funcionales: ingesta, analítica y alertas.
   - Favorece evolución independiente de cada servicio.

4. **Event Notification + Event-Carried State Transfer**
   - Los eventos notifican cambios y transportan contexto mínimo necesario.
   - Permite mantener sincronía eventual entre componentes.

5. **Database per Service (recomendado a mediano plazo)**
   - Cada microservicio gestiona su persistencia según su dominio.
   - Evita acoplamientos por esquema compartido.

6. **CQRS ligero (opcional evolutivo)**
   - Separar flujo de escritura de telemetría del flujo de lectura para dashboard/reportes.

### 2.4 Ventajas y desventajas de cada patrón

| Patrón | Ventajas | Desventajas |
|---|---|---|
| API Gateway | Simplifica acceso cliente, seguridad centralizada, menor complejidad en frontend. | Puede volverse cuello de botella si no se escala o protege correctamente. |
| Pub/Sub | Alto desacoplamiento, buena escalabilidad, integración simple de nuevos consumidores. | Mayor complejidad de trazabilidad y depuración de flujos asíncronos. |
| Microservicios | Despliegue independiente, mantenibilidad por dominio, escalabilidad granular. | Sobrecarga operativa (CI/CD, monitoreo, redes, versionado de contratos). |
| Event Notification / E-CST | Reacción rápida a eventos, habilita procesamiento paralelo. | Riesgo de inconsistencias temporales; requiere idempotencia. |
| Database per Service | Independencia tecnológica y de modelos por dominio. | Dificulta reportes globales; puede requerir replicación o vistas materializadas. |
| CQRS ligero | Mejor rendimiento en lecturas intensivas del dashboard. | Incrementa complejidad de sincronización y diseño del modelo de datos. |

### 2.5 Boceto preliminar de arquitectura (texto/esquema)

```text
Usuario Web
   │
   ▼
Frontend Dashboard (React)
   │ HTTP/WS
   ▼
API Gateway
   │
   ├──────────────► Servicio de Ingesta ──► Broker (RabbitMQ/Kafka)
   │                                         │
   │                                         ├──► Servicio de Analítica ──► Alertas generadas
   │                                         │
   │                                         └──► Servicio de Alertas
   │
   └──────────────► Servicio de consulta (métricas/alertas)

Persistencia NoSQL (Firestore/MongoDB)
   ├── Métricas históricas
   ├── Dispositivos
   └── Alertas

Servicios externos
   ├── Firebase Authentication (Google Login)
   └── Proveedor de notificaciones (futuro)
```

---

## 3) Requerimientos consolidados (entrega completa)

### 3.1 Requerimientos funcionales (RF)
- **RF1:** El sistema recibirá datos energéticos en tiempo real.
- **RF2:** El sistema almacenará métricas históricas por dispositivo.
- **RF3:** El sistema detectará picos de consumo.
- **RF4:** El sistema generará alertas según severidad.
- **RF5:** El sistema mostrará un dashboard web de monitoreo.
- **RF6 (fase evolutiva):** El sistema permitirá autenticación con Google.

### 3.2 Requerimientos no funcionales (RNF)
- **RNF1 Alta disponibilidad** (objetivo de continuidad operativa).
- **RNF2 Escalabilidad horizontal** por microservicio.
- **RNF3 Baja latencia** para visualización de eventos recientes.
- **RNF4 Procesamiento asíncrono** para desacoplar flujos.
- **RNF5 Mantenibilidad alta** con modularidad y ADRs.
- **RNF6 Seguridad** de acceso/autenticación y endurecimiento de API.

---

## 4) ADRs sugeridos para la entrega

### ADR-001 — Uso de Firebase Authentication
**Decisión:** Implementar autenticación con Google mediante Firebase Auth.  
**Motivación:** Acelerar implementación segura de login.  
**Consecuencia:** Menor esfuerzo de gestión de credenciales; dependencia de proveedor externo.

### ADR-002 — Uso de Arquitectura Event-Driven
**Decisión:** Procesar telemetría mediante broker de eventos.  
**Motivación:** Manejar alto volumen de datos con desacoplamiento y resiliencia.  
**Consecuencia:** Mayor complejidad operativa y necesidad de monitoreo de colas.

### ADR-003 — Uso de Base de Datos NoSQL
**Decisión:** Utilizar Firestore o MongoDB para métricas y alertas.  
**Motivación:** Escritura rápida, flexibilidad de esquema y evolución ágil.  
**Consecuencia:** Validar estrategia para consultas analíticas complejas.

---

## 5) Riesgos y mitigación

| Riesgo | Impacto | Mitigación propuesta |
|---|---|---|
| Alto volumen de eventos | Saturación de ingesta y colas | Autoescalado, particionamiento de tópicos/colas y backpressure. |
| Pérdida de eventos | Inconsistencias en métricas/alertas | Confirmaciones ACK, colas durables, reintentos e idempotencia. |
| Alertas tardías | Baja confianza del usuario | Monitoreo de latencia E2E, umbrales y métricas de procesamiento. |
| Dependencia de servicios externos | Interrupción de login/notificaciones | Fallback local, circuit breaker y estrategias de contingencia. |
| Deuda técnica por crecimiento | Dificultad de mantenimiento | ADRs vivos, estándares de contrato y observabilidad temprana. |

---

## 6) Plan de implementación por fases (recomendado)

### Fase 1 (base del proyecto)
- Definición del problema, contexto y alcance.
- C4 Context y C4 Containers.
- API Gateway + Ingesta + Analítica + Alertas.
- Dashboard con visualización básica.
- Simulador de sensores y pruebas funcionales.

### Fase 2 (consolidación)
- Autenticación con Firebase.
- Fortalecer manejo de errores, retries e idempotencia.
- Métricas técnicas (latencia, throughput, error rate).
- Endurecimiento de seguridad y trazabilidad distribuida.
- Preparación para despliegue continuo y ambiente productivo.

---

## 7) Texto breve para presentación oral (opcional)

“Smart Energy Hub resuelve la falta de visibilidad del consumo energético por dispositivo. Para ello, usamos una arquitectura de microservicios orientada a eventos que desacopla la ingesta, analítica y generación de alertas. En Fase 1 definimos contexto, alcance y arquitectura base funcional; en Fase 2 fortalecemos autenticación, resiliencia y observabilidad para escalar hacia producción.”

---

## 8) Checklist de entrega (profesor)

### Fase 1 — Cumplimiento
- [x] Nombre del sistema
- [x] Actores involucrados
- [x] Necesidades del sistema
- [x] Contexto de uso
- [x] Alcance del proyecto
- [x] Limitaciones identificadas

### Fase 2 — Cumplimiento
- [x] Estilo arquitectónico seleccionado
- [x] Justificación del estilo
- [x] Patrones arquitectónicos aplicables
- [x] Ventajas y desventajas por patrón
- [x] Boceto preliminar de arquitectura

