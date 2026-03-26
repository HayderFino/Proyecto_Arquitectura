# ⚡ Smart Energy Hub

> Plataforma web de monitoreo de consumo energético por dispositivo
> **UNISANGIL — Ingeniería de Sistemas | Marzo 2026**
> Equipo: Hayder Fino · Jesús Hernández · Sebastián Castillo

---

## 🏗️ Arquitectura

```
Frontend (React/Vite) → API Gateway (8080) → Microservicios
                                              ├── Ingesta (3001)     → MongoDB
                                              ├── Analítica (3002)   → RabbitMQ consumer
                                              └── Alertas (3003)     → RabbitMQ consumer
                                         ↑
                              Simulador de Sensores
```

## 🚀 Inicio rápido

### Prerrequisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/) (solo para dev local)

### Levantar todo con Docker

```bash
# Desde la carpeta smart-energy-hub/
docker compose up --build -d

# Ver logs
docker compose logs -f

# Detener
docker compose down
```

### Accesos

| Servicio         | URL                          |
|------------------|------------------------------|
| **Frontend**     | http://localhost:5173         |
| **API Gateway**  | http://localhost:8080         |
| **RabbitMQ UI**  | http://localhost:15672 (admin/admin123) |
| Ingesta          | http://localhost:3001/health  |
| Analítica        | http://localhost:3002/health  |
| Alertas          | http://localhost:3003/health  |

---

## 💻 Desarrollo local (sin Docker)

### 1. Servicios de infraestructura con Docker

```bash
docker compose up rabbitmq mongodb -d
```

### 2. Instalar dependencias de cada servicio

```bash
cd services/ingesta   && npm install && npm run dev &
cd services/analitica && npm install && npm run dev &
cd services/alertas   && npm install && npm run dev &
cd services/api-gateway && npm install && npm run dev &
cd simulator          && npm install && node simulate.js &
```

### 3. Frontend

```bash
cd frontend && npm install && npm run dev
```

→ http://localhost:5173

---

## 📡 API Reference

### Ingesta
| Método | Endpoint         | Descripción                |
|--------|------------------|----------------------------|
| POST   | /api/ingest      | Ingesta una lectura        |
| POST   | /api/ingest/batch| Ingesta múltiples lecturas |
| GET    | /api/metrics/latest | Última lectura por device |
| GET    | /api/metrics/:id | Historial de un device     |

### Analítica
| Método | Endpoint                    | Descripción           |
|--------|-----------------------------|-----------------------|
| GET    | /api/analytics/summary      | Resumen por device    |
| GET    | /api/analytics/global       | Stats globales        |
| GET    | /api/analytics/timeline/:id | Timeline de consumo   |

### Alertas
| Método | Endpoint                  | Descripción              |
|--------|---------------------------|--------------------------|
| GET    | /api/alerts               | Lista paginada           |
| GET    | /api/alerts/unread-count  | Contador no leídas       |
| PATCH  | /api/alerts/:id/read      | Marcar como leída        |
| PATCH  | /api/alerts/read-all      | Marcar todas como leídas |

---

## 🔧 Variables de entorno del simulador

| Variable          | Default  | Descripción                            |
|-------------------|----------|----------------------------------------|
| INGESTA_URL       | http://ingesta:3001 | URL del microservicio de ingesta |
| SEND_INTERVAL_MS  | 3000     | Intervalo entre envíos (ms)           |
| DEVICE_COUNT      | 6        | Número de dispositivos a simular      |
| SPIKE_PROBABILITY | 0.1      | Probabilidad de pico [0-1]            |

## 🔧 Variables de entorno de analítica

| Variable       | Default | Descripción                                       |
|----------------|---------|---------------------------------------------------|
| SPIKE_THRESHOLD| 2.5     | Factor sobre promedio para detectar pico          |

---

## 📁 Estructura del proyecto

```
smart-energy-hub/
├── docker-compose.yml
├── mongo-init.js
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/        # Dashboard, Devices, Alerts, Settings
│   │   ├── hooks/        # useWebSocket
│   │   └── services/     # api.js
│   └── nginx.conf
│
├── services/
│   ├── api-gateway/      # Puerto 8080 — Node.js + Express + WS
│   ├── ingesta/          # Puerto 3001 — Node.js + Express
│   ├── analitica/        # Puerto 3002 — Node.js + RabbitMQ consumer
│   └── alertas/          # Puerto 3003 — Node.js + RabbitMQ consumer
│
└── simulator/            # Script de simulación de sensores
```

---

## 🔄 Flujo de datos

```
1. Simulador → POST /api/ingest  → Ingesta Service (3001)
2. Ingesta → guarda en MongoDB + publica en RabbitMQ (sensor.data.raw)
3. Analítica → consume (sensor.data.raw) → calcula media móvil → detecta picos
4. Si pico → publica en RabbitMQ (alerts.generated) + guarda en MongoDB
5. Alertas → consume (alerts.generated) → persiste + broadcast WS
6. API Gateway → polling cada 3-5s → push a clientes vía WebSocket
7. Frontend → actualiza KPIs + gráficas en tiempo real
```

---

*Documento generado como parte del Taller #2 — Arquitectura de Software*
