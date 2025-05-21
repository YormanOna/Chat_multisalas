# 💬 **Chat Multisalas**  
### *¡Conecta y chatea en tiempo real en múltiples salas!*  

**Chat Multisalas** es una aplicación de chat en tiempo real que permite a los usuarios unirse a salas existentes o crear nuevas si son el anfitrión. Desarrollada con tecnologías modernas, ofrece una experiencia fluida y dinámica para la comunicación instantánea.  

---

## 🚀 **Características Principales**  
- **Frontend**: Construido con **React**, **PrimeReact** y **Vite** para una interfaz rápida y elegante.  
- **Backend**: Potenciado por **Node.js**, **Express** y **Socket.IO** para chats en tiempo real.  
- **Salas dinámicas**: El anfitrión crea y elimina salas; los usuarios se unen con un PIN y un nickname.  
- **Comunicación instantánea**: Mensajes enviados y recibidos al instante mediante WebSockets.  

---

## 📂 **Estructura del Proyecto**  
```plaintext  
Chat_multisalas/  
├── client/          # Frontend: React + PrimeReact + Vite  
├── server/          # Backend: Node.js + Express + Socket.IO  
├── .gitignore       # Archivos ignorados por Git  
└── README.md        # ¡Esta documentación!  
```  

---

## 🛠️ **Primeros Pasos**  

### 1. **Clonar el Repositorio**  
Descarga el proyecto y entra al directorio:  
```bash  
git clone https://github.com/YormanOna/Chat_multisalas.git  
cd Chat_multisalas  
```  
### 2. **Instalar Dependencias**  
Abre dos terminales: una para el backend y otra para el frontend.  

#### 🔹 **Backend**  
```bash  
cd server  
npm install  
```  

#### 🔹 **Frontend**  
```bash  
cd client  
npm install  
```  
### 3. **Configurar Variables de Entorno**  
Necesitarás configurar archivos `.env` para el backend y el frontend.  

#### 🔹 **Backend (`server/`)**  
Crea un archivo `server/.env` con:  
```dotenv  
HOST_DEVICE_ID=<UUID_DEL_ANFITRIÓN>  
PORT=3001  
CORS_ORIGINS=http://localhost:3000,http://<TU_IP_LOCAL>:3000  
```  
- **Generar `HOST_DEVICE_ID`**: Este ID identifica al anfitrión. 
1. Abre tu aplicación front en el navegador (ej. http://localhost:3000).
2. Abre la consola de desarrollador (F12 o Ctrl+Shift+I).
3. Ejecuta:

```js
localStorage.getItem('chat_device_id') || localStorage.setItem('chat_device_id', crypto.randomUUID()) || localStorage.getItem('chat_device_id');
```

4. Copia el valor que retorna (`chat_device_id`) y pégalo en `HOST_DEVICE_ID` de tu `.env` del backend.  

- **`<TU_IP_LOCAL>`**: Reemplaza con tu IP local (ej. `192.168.1.100`).  
  - **Windows**: `ipconfig | findstr /R "IPv4"`  
  - **Linux/macOS**: `ifconfig | grep -E "inet (192\.168|10\.)"`  

#### 🔹 **Frontend (`client/`)**  
Crea un archivo `client/.env` con:  
```dotenv  
REACT_APP_SERVER_URL=http://<TU_IP_LOCAL>:3001  
```  
- Usa la misma IP local que en el backend.  

### 4. **Ejecutar la Aplicación**  
Inicia ambos servidores para que el chat funcione.  

#### 🔹 **Backend**  
```bash  
cd server  
nodemon server.js  
```  
Escuchará en `http://localhost:3001` (o el puerto definido).  

#### 🔹 **Frontend**  
En otra terminal:  
```bash  
cd client  
npm start  
```  
Se ejecutará en `http://localhost:3000` (o el puerto asignado por Vite).  

---

## 🔄 **¿Cómo Funciona?**  
- **Anfitrión**: Usa el `HOST_DEVICE_ID` para crear o eliminar salas desde la interfaz.  
- **Usuarios**: Se unen a salas con un PIN y un nickname.  
- **Eventos WebSocket**:  
  - `host_info`: IP y hostname del usuario.  
  - `host_status`: Indica si eres el anfitrión.  
  - `room_data`: Lista de usuarios y límite de la sala.  
  - `room_deleted`: Notifica si el anfitrión elimina la sala.  
- **Mensajes**: Se envían y reciben en tiempo real dentro de la misma sala.  

---

## 📋 **Comandos Útiles**  
| **Acción**            | **Ubicación** | **Comando**                          |  
|-----------------------|---------------|--------------------------------------|  
| Instalar dependencias | `server`      | `npm install`                        |  
| Iniciar servidor      | `server`      | `npm start`                          |  
| Instalar dependencias | `client`      | `npm install`                        |  
| Iniciar cliente       | `client`      | `npm run dev`                        |  
| Generar HOST_DEVICE_ID| Raíz          | `node -e "console.log(crypto.randomUUID())"` |  

---

## ⚙️ **Notas Finales**  
- Verifica que los puertos e IPs en los `.env` sean consistentes.  
- Si cambias la IP o el puerto, reinicia ambos servidores.  
- Guarda tu `HOST_DEVICE_ID` en un lugar seguro: ¡es tu clave para administrar salas!  

¡Disfruta chateando en tiempo real con **Chat Multisalas**! 🎉
