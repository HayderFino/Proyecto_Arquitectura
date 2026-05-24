# 🏗️ C4 Model — Nivel 3: Diagramas de Componentes

Este documento detalla la descomposición del sistema **Smart Energy Hub** en su tercer nivel (Componentes), mostrando la estructura interna de los contenedores definidos en el Corte 1.

---

## 1. Componentes del API Gateway

El **API Gateway** actúa como el punto de entrada único de la aplicación. Administra el enrutamiento a los microservicios, la comunicación WebSocket en tiempo real con el cliente y está preparado para centralizar la seguridad.

![Componentes del API Gateway](diagramas/componentes_del_api_gateway.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
graph TD
    User([Usuario / Navegador]) -->|HTTP / WS| AG_Router[1. Router & Proxy Middleware]
    
    subgraph APIGateway["Contenedor: API Gateway (8080)"]
        AG_Router -->|Filtra/Protege| AG_Auth[2. Auth Middleware - JWT Firebase Stub]
        AG_Auth -->|Valida| AG_Limiter[3. Rate Limiter Middleware]
        AG_Limiter -->|Rutas REST| AG_Proxy[4. Express Proxy Controller]
        AG_Router -->|Conexión WS| AG_WS[5. WebSocket Client Manager]
        AG_WS -->|Escucha picos/actualizaciones| AG_Poller[6. Background Poller Service]
    end

    MS_Ingesta[Microservicio Ingesta :3001]
    MS_Analitica[Microservicio Analítica :3002]
    MS_Alertas[Microservicio Alertas :3003]

    AG_Proxy -->|Redirige REST| MS_Ingesta
    AG_Proxy -->|Redirige REST| MS_Analitica
    AG_Proxy -->|Redirige REST| MS_Alertas
    
    AG_Poller -->|Polling HTTP cada 3s| MS_Analitica
    AG_Poller -->|Polling HTTP cada 3s| MS_Alertas
```
</details>

### Descripción de Componentes del Gateway
1.  **Router & Proxy Middleware**: Intercepta todas las peticiones entrantes. Clasifica si son conexiones WebSocket (`/ws`) o peticiones REST tradicionales (`/api/*`).
2.  **Auth Middleware (JWT Firebase Stub)**: Intercepta las rutas protegidas. En el Corte 2 valida el token Bearer utilizando el Firebase Admin SDK. Si no hay token o es inválido, aborta la petición con `401 Unauthorized`.
3.  **Rate Limiter Middleware**: Evita el abuso de peticiones mediante límites de tasa (especialmente útil para el simulador o llamadas automatizadas de ingesta).
4.  **Express Proxy Controller**: Redirige dinámicamente las llamadas HTTP correspondientes a los puertos internos de los microservicios sin exponerlos directamente a la red externa.
5.  **WebSocket Client Manager**: Mantiene y gestiona el ciclo de vida de los clientes web conectados al canal en tiempo real para empujar (push) novedades.
6.  **Background Poller Service**: Servicio en segundo plano que consulta de manera periódica las bases de datos de analítica y alertas para transmitir actualizaciones inmediatas a través del *WebSocket Client Manager*.

---

## 2. Componentes del Microservicio de Ingesta

El microservicio de **Ingesta** es el encargado de procesar la entrada masiva de lecturas procedentes de los sensores.

![Componentes del Microservicio de Ingesta](diagramas/componentes_del_microservicio_de_ingesta.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
graph TD
    Gateway[API Gateway] -->|POST /api/ingest| Ing_Controller[1. HTTP Ingest Controller]
    
    subgraph IngestaService["Contenedor: Microservicio Ingesta (3001)"]
        Ing_Controller -->|Valida datos| Ing_Validator[2. Schema Validator]
        Ing_Validator -->|Lectura válida| Ing_DBController[3. Metrics DB Controller]
        Ing_Validator -->|Lectura válida| Ing_BrokerPublisher[4. RabbitMQ AMQP Publisher]
    end

    DB[(MongoDB: Colección metrics)]
    Broker{RabbitMQ}

    Ing_DBController -->|Insertar registro| DB
    Ing_BrokerPublisher -->|Publicar evento raw| Broker
```
</details>

### Descripción de Componentes de Ingesta
1.  **HTTP Ingest Controller**: Recibe peticiones individuales o en lote (batch) de lecturas de sensores.
2.  **Schema Validator**: Verifica que el cuerpo del JSON cumpla con el formato técnico exigido (que posea `deviceId`, `deviceName`, `wattage`, `voltage`, `current`, `timestamp`).
3.  **Metrics DB Controller**: Abstrae las operaciones de escritura (append-only) para almacenar el historial de métricas energéticas directamente en la base de datos de producción (MongoDB).
4.  **RabbitMQ AMQP Publisher**: Traduce la lectura a un formato de evento y lo publica con confirmación (ACK) en el intercambio del broker de mensajes utilizando la cola `sensor.data.raw`.

---

## 3. Componentes del Microservicio de Analítica

El microservicio de **Analítica** procesa los eventos raw asíncronamente y determina la existencia de picos de consumo utilizando una media móvil.

![Componentes del Microservicio de Analítica](diagramas/componentes_del_microservicio_de_analitica.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
graph TD
    Broker{RabbitMQ} -->|Cola: sensor.data.raw| Ana_Consumer[1. RabbitMQ AMQP Consumer]
    
    subgraph AnaliticaService["Contenedor: Microservicio Analítica (3002)"]
        Ana_Consumer -->|Procesa evento| Ana_Engine[2. Moving Average Engine]
        Ana_Engine -->|Actualiza ventana 20| Ana_Window[3. Sliding Window Cache]
        Ana_Engine -->|Si wattage > avg * 2.5| Ana_Classifier[4. Severity Classifier]
        Ana_Classifier -->|Genera alerta| Ana_Publisher[5. Alert Event Publisher]
    end

    Ana_Publisher -->|Publica evento alerta| Broker
```
</details>

### Descripción de Componentes de Analítica
1.  **RabbitMQ AMQP Consumer**: Se suscribe de forma persistente a la cola `sensor.data.raw`, leyendo los eventos de sensores a medida que son publicados por Ingesta.
2.  **Moving Average Engine**: Núcleo algorítmico del servicio. Calcula el promedio del consumo histórico para el dispositivo en cuestión.
3.  **Sliding Window Cache**: Almacenamiento rápido en memoria cache estructurado (ventana deslizante de tamaño 20 por dispositivo) de las últimas lecturas para calcular la media móvil sin consultar la base de datos.
4.  **Severity Classifier**: Clasifica los picos detectados basándose en el ratio `lectura_actual / promedio_movil` en cuatro rangos de severidad: *low, medium, high* y *critical*.
5.  **Alert Event Publisher**: Publica los eventos clasificados de alertas en la cola de RabbitMQ `alerts.generated` para su almacenamiento y consumo del Gateway.

---

## 4. Componentes del Microservicio de Alertas

El microservicio de **Alertas** gestiona la base de datos de alertas generadas y ofrece un servicio CRUD para consultar y modificar su estado de lectura.

![Componentes del Microservicio de Alertas](diagramas/componentes_del_microservicio_de_alertas.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
graph TD
    Broker{RabbitMQ} -->|Cola: alerts.generated| Ale_Consumer[1. RabbitMQ AMQP Consumer]
    Gateway[API Gateway] -->|GET / PATCH /api/alerts| Ale_Controller[2. Alerts CRUD Controller]

    subgraph AlertasService["Contenedor: Microservicio Alertas (3003)"]
        Ale_Consumer -->|Recibe alerta| Ale_DBController[3. Alertas DB Controller]
        Ale_Controller -->|Consulta / Modifica| Ale_DBController
    end

    DB[(MongoDB: Colección alerts)]
    Ale_DBController -->|Escribe / Lee / Actualiza| DB
```
</details>

### Descripción de Componentes de Alertas
1.  **RabbitMQ AMQP Consumer**: Se suscribe a `alerts.generated`. Garantiza la recepción y el procesamiento seguro de cada alerta creada por Analítica.
2.  **Alerts CRUD Controller**: Expone las API HTTP internas necesarias para consultar alertas paginadas, contar alertas sin leer y marcar alertas específicas como leídas por el usuario final.
3.  **Alertas DB Controller**: Encapsula las consultas y escrituras a la colección `alerts` de MongoDB (o Firestore) para mantener la persistencia persistente del estado de las alertas.

---

## 5. Componentes del Frontend (React + Vite)

El **Frontend** está organizado como una SPA modularizada donde los componentes interactúan de forma reactiva con los datos en tiempo real.

![Componentes del Frontend (React + Vite)](diagramas/componentes_del_frontend_react_vite.svg)

<details>
<summary>💻 Ver código fuente Mermaid</summary>

```mermaid
graph TD
    User([Usuario]) -->|Interactúa| FE_Shell[1. App Shell / Layout]
    
    subgraph FrontendSPA["Contenedor: Frontend SPA"]
        FE_Shell -->|Renderiza ruta| FE_Pages[2. Page Views: Dashboard/Devices/Alerts/Settings]
        FE_Pages -->|Consigue Datos| FE_HookWS[3. useWebSocket Hook]
        FE_Pages -->|Llama API REST| FE_Client[4. Axios API Client Service]
        FE_HookWS -->|Procesa mensajes WS| FE_State[5. Global UI React State]
    end

    Gateway[API Gateway :8080]
    FE_Client -->|Peticiones HTTP| Gateway
    Gateway -->|WebSocket Push| FE_HookWS
```
</details>

### Descripción de Componentes del Frontend
1.  **App Shell / Layout**: Contiene la navegación principal, barra lateral, barra superior y gestiona la estructura visual principal del aplicativo.
2.  **Page Views**: Vistas del cliente:
    *   *Dashboard*: Muestra métricas globales, gráficos en tiempo real con **Recharts** y un resumen analítico.
    *   *Devices*: Lista y detalla el estado actual, históricos y barra de carga de cada dispositivo.
    *   *Alerts*: Centro de visualización de eventos de consumo anómalo con paginación e interacción.
    *   *Settings*: Configuración de variables del simulador y visualizador técnico de la arquitectura.
3.  **useWebSocket Hook**: Hook personalizado de React que abre la conexión con `/ws`, gestiona la reconexión automática en caso de caída y parsea los mensajes entrantes de métricas y alertas.
4.  **Axios API Client Service**: Cliente HTTP centralizado para interactuar con la REST API del Gateway (marcar alertas, traer históricos, etc.).
5.  **Global UI React State**: Estado reactivo global que almacena el buffer de métricas del dashboard en tiempo real y desencadena notificaciones flotantes (toasts) cuando llega una nueva alerta crítica.
