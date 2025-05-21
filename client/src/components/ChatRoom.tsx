// src/components/ChatRoom.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Toast } from 'primereact/toast';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Avatar } from 'primereact/avatar';
import { ProgressBar } from 'primereact/progressbar';
import { Dialog } from 'primereact/dialog';
import { getDeviceId } from '../utils/device';
import '../styles/ChatRoom.css';

interface Message {
  autor: string;
  message: string;
}

interface HostInfo {
  ip: string;
  hostname: string;
}

interface RoomData {
  users: { nickname: string; ip: string }[];
  limit: number;
}

interface JoinRoomResponse {
  success: boolean;
  message?: string;
}

interface DeleteRoomResponse {
  success: boolean;
  message?: string;
}

const SERVER_URL = process.env.REACT_APP_SERVER_URL!;

const ChatRoom: React.FC = () => {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { nickname, isHost } = (location.state as any) || {};
  const deviceId = getDeviceId();

  const [hostInfo, setHostInfo]         = useState<HostInfo | null>(null);
  const [usersCount, setUsersCount]     = useState<number>(0);
  const [limit, setLimit]               = useState<number>(0);
  const [participants, setParticipants] = useState<{ nickname: string; ip: string }[]>([]);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [message, setMessage]           = useState<string>('');
  const [typing, setTyping]             = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [showParticipants, setShowParticipants] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const toast     = useRef<Toast>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Indicador de escritura
  useEffect(() => {
    setTyping(message.length > 0);
  }, [message]);

  // Conexión y eventos
  useEffect(() => {
    if (!pin || !nickname) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'PIN o nickname faltante', life: 3000 });
      navigate('/join');
      return;
    }

    const socket = io(SERVER_URL, { query: { deviceId } });
    socketRef.current = socket;

    socket.on('host_info', (data: HostInfo) => setHostInfo(data));

    socket.on('connect', () => {
      socket.emit(
        'join_room',
        { pin, nickname },
        (resp: JoinRoomResponse) => {
          if (!resp.success) {
            toast.current?.show({ severity: 'warn', summary: 'Aviso', detail: resp.message, life: 3000 });
            navigate('/join');
          } else {
            toast.current?.show({ severity: 'success', summary: 'Conectado', detail: `Bienvenido a la sala ${pin}`, life: 2000 });
          }
        }
      );
    });

    socket.on('room_data', (data: RoomData) => {
      setUsersCount(data.users.length);
      setLimit(data.limit);
      setParticipants(data.users); // ahora trae nickname + ip
    });

    socket.on('receive_message', (m: Message) => setMessages(ms => [...ms, m]));

    socket.on('room_deleted', () => {
      toast.current?.show({ severity: 'info', summary: 'Sala eliminada', detail: 'El anfitrión cerró la sala', life: 3000 });
      navigate('/');
    });

    return () => {
      socket.disconnect();
    };
  }, [pin, nickname, deviceId, navigate]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socketRef.current?.emit('send_message', { pin, autor: nickname, message });
    setMessage('');
  };

  const confirmDeleteRoom = () => setShowDeleteDialog(true);

  const deleteRoom = () => {
    setShowDeleteDialog(false);
    socketRef.current?.emit(
      'delete_room',
      { pin },
      (resp: DeleteRoomResponse) => {
        if (!resp.success) {
          toast.current?.show({ severity: 'error', summary: 'Error', detail: resp.message, life: 3000 });
        }
      }
    );
  };

  // Porcentaje de ocupación
  const occupancyPercent = limit > 0 ? Math.round((usersCount / limit) * 100) : 0;

  return (
    <div className="chat-room-container">
      <Toast ref={toast} position="top-right" />

      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <h5 className="mb-1">Sala {pin}</h5>
          {hostInfo && (
            <small className="text-muted">
              {isHost
                ? `Tú: ${nickname} (${hostInfo.ip})`
                : `Conectado a ${hostInfo.hostname} (${hostInfo.ip})`}
            </small>
          )}
        </div>
        <div className="header-right">
          <Badge value={`${usersCount}/${limit}`} className="me-2" />
          {isHost && (
            <Button
              icon="pi pi-users"
              className="p-button-rounded p-button-text p-button-info me-2"
              onClick={() => setShowParticipants(true)}
              tooltip="Ver participantes"
              tooltipOptions={{ position: 'bottom' }}
            />
          )}
          {isHost && (
            <Button
              icon="pi pi-trash"
              className="p-button-rounded p-button-text p-button-danger me-2"
              onClick={confirmDeleteRoom}
              tooltip="Eliminar sala"
              tooltipOptions={{ position: 'bottom' }}
            />
          )}
          <Button
            icon="pi pi-sign-out"
            className="p-button-rounded p-button-text p-button-secondary"
            onClick={() => navigate('/')}
            tooltip="Salir"
            tooltipOptions={{ position: 'bottom' }}
          />
        </div>
      </header>

      {/* Barra de ocupación */}
      <div className="capacity-bar-container">
        <ProgressBar value={occupancyPercent} showValue={false} style={{ height: '4px' }} />
      </div>

      {/* Mensajes */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon"><i className="pi pi-comments"></i></div>
            <h4>Inicio de la conversación</h4>
            <p>Sé el primero en enviar un mensaje</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const own = m.autor === nickname;
            return (
              <div key={i} className={`message-row ${own ? 'own-message' : 'other-message'}`}>
                {!own && <Avatar label={m.autor.charAt(0)} shape="circle" className="me-2" />}
                <div className="message-content">
                  {!own && <div className="message-author">{m.autor}</div>}
                  <div className={`message-bubble ${own ? 'own-bubble' : 'other-bubble'}`}>
                    <div className="message-text">{m.message}</div>
                    <div className="message-time">{new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {typing && (
          <div className="typing-indicator mb-2">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Input */}
      <footer className="chat-input-container">
        <div className="input-wrapper">
          <InputTextarea
            value={message}
            onChange={e => setMessage(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            rows={1}
            autoResize
            placeholder="Escribe un mensaje..."
            className="message-input"
          />
          <Button
            icon="pi pi-send"
            className="p-button-rounded send-button"
            onClick={sendMessage}
            disabled={!message.trim()}
          />
        </div>
      </footer>

      {/* Participantes (anfitrión) */}
      <Dialog
        header="Participantes"
        visible={showParticipants}
        style={{ width: '320px' }}
        onHide={() => setShowParticipants(false)}
        modal
      >
        <ul className="list-group list-group-flush">
          {participants.map((p, i) => (
            <li key={i} className="list-group-item d-flex justify-content-between">
              <span>{p.nickname}</span>
              <small className="text-muted">{p.ip}</small>
            </li>
          ))}
        </ul>
      </Dialog>

      {/* Confirmación eliminación */}
      <Dialog
        header="Confirmar eliminación"
        visible={showDeleteDialog}
        style={{ width: '450px' }}
        modal
        footer={
          <div className="dialog-footer">
            <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={() => setShowDeleteDialog(false)} />
            <Button label="Eliminar" icon="pi pi-trash" className="p-button-danger" onClick={deleteRoom} />
          </div>
        }
        onHide={() => setShowDeleteDialog(false)}
        dismissableMask
      >
        <div className="dialog-content text-center">
          <i className="pi pi-exclamation-triangle" style={{ fontSize:'2rem', color:'#f00' }}></i>
          <p>¿Eliminar esta sala? Se desconectará a todos.</p>
        </div>
      </Dialog>
    </div>
  );
};

export default ChatRoom;
