# 🏛️ Modelo de Vistas 4+1 — Smart Energy Hub

Este documento describe la arquitectura del sistema **Smart Energy Hub** utilizando el **Modelo de Vistas 4+1** de Kruchten. Este marco permite representar el diseño de software desde diferentes perspectivas para satisfacer a los distintos *stakeholders* (desarrolladores, administradores de sistemas, ingenieros de QA y clientes).

---

## 🚀 Vista de Escenarios (El "+1")

La vista de escenarios une a las otras cuatro perspectivas mediante los casos de uso críticos del sistema.

### Caso de Uso 1: Monitoreo en Tiempo Real (Telemetría de Sensores)
*   **Actores**: Simulador de Sensores (Productor), Usuario Web (Visualizador).
*   **Flujo**: El simulador envía datos energéticos continuos; el sistema ingesta, registra, publica y empuja estos datos mediante WebSockets al dashboard web en menos de 2 segundos.

### Caso de Uso 2: Detección y Gestión de Alertas de Pico
*   **Actores**: Microservicio de Analítica (Analizador), Microservicio de Alertas (Gestor), Usuario Web.
*   **Flujo**: Se detecta un pico de consumo. Analítica genera un evento de alerta, Alertas lo persiste e inmediatamente el usuario recibe una notificación emergente en su pantalla que puede marcar como "leída".

![Vista de Escenarios (El "+1")](diagramas/vista_de_escenarios_el_1.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
flowchart LR
    Usuario("Usuario Final")
    Sensor("Simulador de Sensores")
    
    subgraph CasosDeUso["Casos de Uso (Smart Energy Hub)"]
        UC1("(UC1) Monitorear consumo en tiempo real")
        UC2("(UC2) Recibir alertas de picos de consumo")
        UC3("(UC3) Marcar alertas como leídas")
        UC4("(UC4) Enviar lectura energética")
    end
    
    Usuario --> UC1
    Usuario --> UC2
    Usuario --> UC3
    
    Sensor --> UC4
```
</details>

---

## 🧩 1. Vista Lógica

La Vista Lógica se centra en los requisitos funcionales del sistema, mostrando las abstracciones de datos y el modelo de dominio.

### Esquemas de Datos (MongoDB)

![Esquemas de Datos (MongoDB)](diagramas/esquemas_de_datos_mongodb.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
classDiagram
    class Device {
        +String deviceId
        +String name
        +String location
        +Date createdAt
    }

    class Metric {
        +ObjectId _id
        +String deviceId
        +Number wattage
        +Number voltage
        +Number current
        +Date timestamp
    }

    class Alert {
        +ObjectId _id
        +String deviceId
        +String severity
        +Number wattage
        +Number ratio
        +String message
        +Boolean isRead
        +Date timestamp
    }

    Device "1" --> "*" Metric : genera
    Device "1" --> "*" Alert : genera picos en
```
</details>

---

## ⚙️ 2. Vista de Procesos

La Vista de Procesos explica el comportamiento dinámico del sistema en tiempo de ejecución, abordando la concurrencia, sincronización de hilos y flujo de datos.

### Diagrama de Secuencia: Ingesta de Telemetría y Detección Asíncrona de Picos

![Diagrama de Secuencia: Ingesta de Telemetría y Detección Asíncrona de Picos](diagramas/diagrama_de_secuencia_ingesta_de_telemetria_y_deteccion_asincrona_de_picos.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
sequenceDiagram
    autonumber
    participant S as Simulador (Sensor)
    participant GW as API Gateway (:8080)
    participant ING as Ingesta (:3001)
    participant DB as MongoDB
    participant RMQ as RabbitMQ (Broker)
    participant ANA as Analítica (:3002)
    participant ALE as Alertas (:3003)
    participant FE as Frontend React (:5173)

    S->>GW: POST /api/ingest/batch (Métricas)
    GW->>ING: Redirección HTTP
    ING->>ING: Valida formato
    ING->>DB: Guarda métrica en históricos (Colección metrics)
    ING->>RMQ: publica(sensor.data.raw)
    ING-->>GW: 202 Accepted
    GW-->>S: Respuesta exitosa

    Note over RMQ,ANA: Comunicación Asíncrona (AMQP)
    RMQ->>ANA: consume(sensor.data.raw)
    ANA->>ANA: Agrega a ventana móvil (Cache)
    ANA->>ANA: Calcula media y valida ratio (W > Promedio * 2.5)
    
    alt Pico Detectado!
        ANA->>RMQ: publica(alerts.generated)
        RMQ->>ALE: consume(alerts.generated)
        ALE->>DB: Guarda alerta (Colección alerts)
    end

    Note over GW,FE: Tiempo real (WebSockets / Polling)
    GW->>ALE: Consulta nuevas alertas (HTTP Polling)
    ALE-->>GW: Retorna lista
    GW->>FE: WebSocket push (Métricas + Alertas)
    FE->>FE: Dispara visualización y Toast Alerta!
```
</details>

---

## 📦 3. Vista de Desarrollo (Implementación)

La Vista de Desarrollo describe cómo está estructurado el código fuente en carpetas y la gestión de paquetes del proyecto.

### Estructura de Módulos (Monorepo del Proyecto)

![Estructura de Módulos (Monorepo del Proyecto)](diagramas/estructura_de_modulos_monorepo_del_proyecto.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
graph TD
    subgraph Repositorio["Carpeta Raíz: Proyecto_Arquitectura/smart-energy-hub"]
        R_All[run-all.js]
        
        subgraph Services["Carpeta: services/"]
            GW[api-gateway/]
            ING[ingesta/]
            ANA[analitica/]
            ALE[alertas/]
        end
        
        subgraph Front[Carpeta: frontend/]
            F_Src[src/]
            F_Config[vite.config.js]
        end

        subgraph Sim[Carpeta: simulator/]
            S_Sim[simulate.js]
        end
    end

    GW -->|Require interno en run-all| R_All
    ING -->|Require interno en run-all| R_All
    ANA -->|Require interno en run-all| R_All
    ALE -->|Require interno en run-all| R_All
    S_Sim -->|Require interno en run-all| R_All
```
</details>

### Relación de Dependencias del Proyecto (NPM)
*   **api-gateway**: `express`, `ws`, `cors`, `http-proxy-middleware`.
*   **ingesta**: `express`, `mongoose`, `amqplib` (RabbitMQ), `cors`.
*   **analitica**: `express`, `amqplib`, `cors`.
*   **alertas**: `express`, `mongoose`, `amqplib`, `cors`.
*   **frontend**: `react`, `react-dom`, `recharts` (gráficos), `lucide-react` (iconos), `axios` (HTTP), `vite` (bundler).
*   **simulator**: `axios`.

---

## 🖥️ 4. Vista Física (Despliegue)

La Vista Física describe la topología de red, el hardware y la distribución física de los componentes ejecutándose en los servidores de producción.

### Topología de Despliegue en Producción (Cloud Híbrido)

![Topología de Despliegue en Producción (Cloud Híbrido)](diagramas/topologia_de_despliegue_en_produccion_cloud_hibrido.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
graph TD
    subgraph ClientPC["Dispositivo Cliente"]
        Browser[Navegador Web: Chrome / Firefox / Safari]
    end

    subgraph CDN["CDN / Frontend Hosting (Render / Vercel)"]
        F_Server[Servidor Nginx / Frontend Estático :5173]
    end

    subgraph AppServer["Servidor de Aplicaciones (Railway / VPS Node.js)"]
        Gateway[API Gateway :8080]
        MS_ING[Microservicio Ingesta :3001]
        MS_ANA[Microservicio Analítica :3002]
        MS_ALE[Microservicio Alertas :3003]
        SIM[Simulador de Sensores]
    end

    subgraph DataServices["Servicios Cloud de Infraestructura"]
        Broker[RabbitMQ Cloud: CloudAMQP]
        BD[(MongoDB Cloud: MongoDB Atlas)]
    end

    Browser -->|HTTPS| F_Server
    Browser -->|HTTP / WS :8080| Gateway
    Gateway -->|HTTP Interno :3001| MS_ING
    Gateway -->|HTTP Interno :3002| MS_ANA
    Gateway -->|HTTP Interno :3003| MS_ALE
    
    MS_ING -->|AMQP SSL| Broker
    MS_ANA -->|AMQP SSL| Broker
    MS_ALE -->|AMQP SSL| Broker
    SIM -->|HTTP :8080| Gateway

    MS_ING -->|TCP 27017| BD
    MS_ALE -->|TCP 27017| BD
```
</details>
