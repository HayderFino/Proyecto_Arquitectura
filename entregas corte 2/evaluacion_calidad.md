# 🏛️ Evaluación de Calidad Ampliada (ATAM) — Corte 2

Este documento presenta la evaluación de calidad arquitectónica del sistema **Smart Energy Hub** bajo la metodología **ATAM (Architecture Tradeoff Analysis Method)**. En este Corte 2, se valida el diseño a través de escenarios aterrizados a un entorno de producción (que incluye persistencia en MongoDB, broker de mensajería asíncrona y seguridad vía Firebase Auth).

---

## 1. Árbol de Utilidad Consolidado

El árbol de utilidad prioriza los objetivos del sistema basándose en la importancia para el negocio (B) y la dificultad técnica (T) en una escala (High/Medium/Low).

```
UTILIDAD DEL SISTEMA (Smart Energy Hub)
│
├── 🔴 DISPONIBILIDAD (H, H)
│   ├── [QAS-01] Tolerancia a caídas del Microservicio de Analítica (0% pérdida de datos).
│   └── [QAS-06] Resiliencia de la cola de RabbitMQ ante picos repentinos de telemetría (Backpressure).
│
├── 🔵 SEGURIDAD (H, H)
│   ├── [QAS-05] Validación centralizada de JWT en API Gateway (bloqueo inmediato si es inválido).
│   └── [QAS-07] Aislamiento de datos multi-tenant (un usuario no puede ver dispositivos ajenos).
│
├── 🟠 RENDIMIENTO (H, M)
│   ├── [QAS-02] Latencia de actualización del dashboard en tiempo real menor a 2 segundos.
│   └── [QAS-08] Latencia del cálculo de la media móvil con alta concurrencia de sensores.
│
└── 🟢 MANTENIBILIDAD (M, H)
    └── [QAS-04] Reemplazar o desplegar un servicio individual sin apagar o alterar el resto del sistema.
```

---

## 2. Escenarios de Calidad Prioritarios — Evaluación Detallada

### Escenario 1: Disponibilidad ante Fallas del Consumidor (QAS-01)
*   **Atributo**: Disponibilidad.
*   **Estímulo**: El microservicio de analítica sufre un fallo crítico y se apaga en producción.
*   **Mecanismo / Táctica**: *Redundancia Pasiva con Buffer (RabbitMQ)*.
*   **Comportamiento**: 
    1. El microservicio de Ingesta continúa recibiendo lecturas del simulador sin enterarse de la caída de Analítica.
    2. Las lecturas validadas se persisten en MongoDB y se publican en la cola `sensor.data.raw`.
    3. RabbitMQ retiene las lecturas de forma persistente.
    4. Al reiniciarse Analítica, consume las lecturas pendientes sin pérdida alguna.
*   **Métrica de Éxito**: 0% de pérdida de lecturas de sensores; latencia de recuperación imperceptible para la persistencia.

![Disponibilidad ante Fallas del Consumidor (QAS-01)](diagramas/escenario_1_disponibilidad_ante_fallas_del_consumidor_qas-01.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
graph LR
    Sensors[Sensores] -->|1. Lectura| Ingesta[Ingesta :3001]
    Ingesta -->|2. Persiste| DB[(MongoDB)]
    Ingesta -->|3. Publica| Broker{RabbitMQ}
    Broker -.->|4. Cola acumulada| Analitica[Analítica :3002]
    style Analitica fill:#ff9999,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
    Note right of Broker: Retiene mensajes en cola <br>mientras Analítica está caída
```
</details>

---

### Escenario 2: Seguridad en el Acceso y Autenticación (QAS-05)
*   **Atributo**: Seguridad.
*   **Estímulo**: Un usuario malintencionado intenta realizar peticiones REST directamente a `/api/alerts` o abrir una conexión WebSocket `/ws` sin token.
*   **Mecanismo / Táctica**: *Autenticación y Autorización Centralizada (API Gateway)*.
*   **Comportamiento**:
    1. La petición llega al API Gateway.
    2. El middleware de autorización busca el header `Authorization: Bearer <JWT>`.
    3. Si no existe, rechaza la petición inmediatamente con código `401 Unauthorized` sin redirigirla a los microservicios internos.
    4. En Corte 2, el Gateway valida la autenticidad del token firmando con el SDK de Firebase.
*   **Métrica de Éxito**: 100% de peticiones no firmadas bloqueadas en la frontera del sistema.

---

### Escenario 3: Rendimiento bajo Carga Concurrente (QAS-02)
*   **Atributo**: Rendimiento.
*   **Estímulo**: Múltiples simuladores envían 100 eventos por segundo de manera simultánea.
*   **Mecanismo / Táctica**: *Procesamiento Asíncrono Desacoplado*.
*   **Comportamiento**:
    1. Ingesta responde inmediatamente `202 Accepted` tras enviar el mensaje a la cola, liberando el hilo del servidor HTTP.
    2. El broker RabbitMQ distribuye asíncronamente el procesamiento en paralelo.
    3. El Gateway despacha actualizaciones de UI optimizadas en lotes periódicos por WebSocket.
*   **Métrica de Éxito**: Tiempo de respuesta HTTP del endpoint de ingesta < 80ms; latencia de reflejo visual < 2 segundos.

---

## 3. Matriz de Trade-offs (Puntos de Compromiso Arquitectónico)

El diseño de **Smart Energy Hub** ha tomado decisiones que favorecen ciertos atributos de calidad pero penalizan otros:

| Decisión Arquitectónica | Atributo Beneficiado | Atributo Penalizado | Justificación del Compromiso (*Trade-off*) |
|-------------------------|----------------------|---------------------|--------------------------------------------|
| **Uso de Broker asíncrono (RabbitMQ)** | 🔴 Disponibilidad (0% pérdida de datos) | 🟠 Rendimiento (Consistencia eventual) | Se prefiere garantizar que todas las métricas históricas estén completas, aceptando que una alerta de pico de energía llegue 1 o 2 segundos tarde al usuario. |
| **Arquitectura de Microservicios** | 🟢 Mantenibilidad (Servicios independientes) | 🟢 Mantenibilidad Operativa (Complejidad de red) | Desplegar componentes por separado facilita actualizar el motor de analítica sin apagar la ingesta. Se asume el costo de red interno y la configuración de puertos. |
| **API Gateway como intermediario único** | 🔵 Seguridad (Auth centralizado) | 🟠 Rendimiento (Un salto de red adicional) | Centralizar la autenticación con Firebase evita repetir código y llaves en cada microservicio, asumiendo un costo mínimo de latencia de red de unos milisegundos. |
| **Base de Datos NoSQL (MongoDB)** | 🟡 Escalabilidad (Escritura veloz) | 🔴 Consistencia (Sin integridad relacional fuerte) | Los datos de telemetría son puramente temporales y de lectura directa. No requieren transacciones complejas o relaciones SQL. |

---

## 4. Sensibilidades y Riesgos Arquitectónicos

### Puntos de Sensibilidad (Decisiones críticas)
1.  **Capacidad de Ventana en Analítica**: Si el tamaño de la ventana móvil es muy pequeño (p. ej. 3 lecturas), el sistema genera demasiadas alertas falsas por picos menores. Si es muy grande (p. ej. 100 lecturas), la respuesta de detección es tardía. (Sensibilidad: *Usabilidad vs Precisión*).
2.  **Periodo de Polling en Gateway**: Establecido en 3 segundos. Bajarlo a menos de 1 segundo sobrecargaría las bases de datos; subirlo a más de 5 segundos arruinaría la experiencia de tiempo real del usuario. (Sensibilidad: *Rendimiento vs Experiencia de Usuario*).

### Riesgos Identificados y Mitigación
*   **Riesgo 1: RabbitMQ como único Punto de Fallo (SPOF)**.
    *   *Impacto*: Crítico. Si cae el broker, Ingesta no puede enviar datos a Analítica ni Alertas.
    *   *Mitigación*: En entornos reales se configura RabbitMQ en modo cluster con replicación activa (Mirrored Queues).
*   **Riesgo 2: Retraso en validaciones externas (Firebase)**.
    *   *Impacto*: Medio. La latencia de validar un token JWT con servidores externos de Firebase en cada llamada puede degradar la experiencia.
    *   *Mitigación*: El API Gateway implementa una cache local en memoria de corta duración para almacenar temporalmente los tokens validados y evitar llamadas consecutivas a Firebase.
