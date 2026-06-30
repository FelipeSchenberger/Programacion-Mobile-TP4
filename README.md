# NeoBank Core - Arquitectura de Microservicios Basada en Eventos 🚀

Este proyecto es una simulación completa del backend y frontend de una aplicación bancaria moderna. Construido con **React Native** para el cliente móvil (web) y **NestJS + Kafka** para el backend, implementa un ecosistema distribuido que procesa transferencias de dinero garantizando seguridad, consistencia y observabilidad en tiempo real.

## 🌟 Características y Arquitectura
- **Patrón Saga (Core Orquestador):** El `saga-engine` (Orchestrator) gestiona las transacciones de manera asíncrona simulando una verificación de fondos y un motor antifraude. Realiza *commit* o *rollback* según el nivel de riesgo detectado.
- **Microservicios Aislados:** 
  - `bank-api`: Recibe peticiones HTTP, validando los envíos y despachando *commands* a Kafka.
  - `saga-engine`: Procesador central.
  - `ws-gateway`: Se encarga de enviar los eventos de Kafka directo a los clientes (app React Native) usando WebSockets seguros.
- **Garantía de Orden:** Se usa `transactionId` como Clave de Partición en Kafka, asegurando un procesamiento FIFO estricto de eventos por cada transacción.
- **Diseño de Interfaz "Neo-Bank":** Tema minimalista, claro (Light Mode) inspirado en billeteras virtuales contemporáneas con actualizaciones de estado en tiempo real sin requerir recargar la pantalla.

## ✨ Características Avanzadas (Implementación Extra)
Cumpliendo con los "Siguientes pasos" y buenas prácticas sugeridas, este proyecto incluye características adicionales a nivel empresarial:
1. **Idempotencia de Comandos:** El Orchestrator guarda en memoria los IDs (`correlationId`) de los comandos ya procesados. Si Kafka envía el mismo comando dos veces debido a una retransmisión por red, el sistema detectará el duplicado y lo ignorará, evitando el "doble gasto" (side-effects perjudiciales en cuentas).
2. **Cola de Mensajes Muertos (DLQ):** Todos los procesamientos del Orchestrator están protegidos. Si ocurre un fallo crítico e irrecuperable (ej. datos faltantes que provocan una excepción), el mensaje no traba el sistema, sino que se captura y se desvía de forma segura al tópico `txn.dlq` para ser inspeccionado offline.

## 📂 Estructura de Directorios Diferenciada
La estructura del proyecto fue adaptada para organizar mejor las responsabilidades del ecosistema:
- `/bank-api` (API pública que inicia transacciones)
- `/saga-engine` (Motor orquestador que consume comandos)
- `/ws-gateway` (Puerta de enlace WebSocket para la App)
- `/bank-app` (Aplicación Frontend en React Native / Expo)

## 🛠️ Cómo Ejecutar el Proyecto

### 1. Levantar la Infraestructura y Backend (Docker)
Abre tu terminal en la raíz de este proyecto y ejecuta:
```bash
docker-compose up --build -d
```
Esto inicializará ZooKeeper, Kafka, los tópicos necesarios, y nuestros tres microservicios principales (`api`, `orchestrator`, `gateway`).

### 2. Iniciar la Billetera Virtual (Frontend)
Abre otra terminal, entra a la carpeta de la app e instálala si es la primera vez:
```bash
cd bank-app
npm install
npm run web -c
```
Esto abrirá la aplicación en `http://localhost:8081` donde podrás realizar transferencias y ver la magia en la "Línea de Tiempo de Eventos".
