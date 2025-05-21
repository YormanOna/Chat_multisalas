import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Tooltip } from 'primereact/tooltip';
import { ProgressBar } from 'primereact/progressbar';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import { io, Socket } from 'socket.io-client';
import { getDeviceId } from '../utils/device';
import '../styles/RoomList.css'; 

interface RoomInfo {
  pin: string;
  count: number;
  limit: number;
}

const SERVER_URL = process.env.REACT_APP_SERVER_URL!;

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [limit, setLimit] = useState<number>(5);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const socketRef = useRef<Socket | null>(null);
  const toast = useRef<Toast>(null);
  const navigate = useNavigate();
  const deviceId = getDeviceId();

  useEffect(() => {
    const socket = io(SERVER_URL, { query: { deviceId } });
    socketRef.current = socket;

    socket.on('host_status', ({ isHost }) => setIsHost(isHost));

    const load = () => {
      socket.emit('get_rooms', null, ({ success, rooms, isHost }: any) => {
        if (success) {
          setRooms(rooms);
        } else {
          toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar salas', life: 3000 });
        }
        setIsHost(isHost);
        setLoading(false);
      });
    };

    load();
    const iv = setInterval(load, 5000);
    return () => { clearInterval(iv); socket.disconnect(); };
  }, [deviceId]);

  const handleCreate = () => {
    socketRef.current!.emit(
      'create_room',
      { nickname: 'Anfitrión', limit },
      ({ success, pin, message }: any) => {
        if (success) {
          navigate(`/chat/${pin}`, { state: { nickname: 'Anfitrión', isHost: true } });
        } else {
          toast.current?.show({ severity: 'warn', summary: 'Aviso', detail: message, life: 3000 });
        }
      }
    );
  };

  // Custom color functions for room capacity
  const getRoomCapacityColor = (percent: number) => {
    if (percent < 50) return 'var(--green-500)';
    if (percent < 80) return 'var(--orange-500)';
    return 'var(--red-500)';
  };

  return (
    <div className="room-list-container">
      <Toast ref={toast} position="top-right" />
      
      <div className="page-header">
        <h2>Salas de Chat</h2>
        <p className="subtitle">Únete a salas existentes o crea una nueva</p>
      </div>
      
      <Card className="main-card">
        <div className="card-header">
          <div className="header-left">
            <h4 className="section-title">
              <i className="pi pi-list mr-2"></i>
              Salas Disponibles
            </h4>
            <Badge value={rooms.length} severity="info" className="room-count-badge" />
          </div>
          
          <div className="header-right">
            {isHost && (
              <Button 
                label="Nueva Sala" 
                icon="pi pi-plus" 
                className="p-button-rounded p-button-success create-room-btn"
                onClick={handleCreate}
              />
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
            <p>Cargando salas...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <i className="pi pi-inbox empty-icon"></i>
            <h5>No hay salas activas</h5>
            <p>¿Por qué no creas una nueva sala?</p>
          </div>
        ) : (
          <div className="room-list">
            {rooms.map(r => {
              const percent = Math.round((r.count / r.limit) * 100);
              const capacityColor = getRoomCapacityColor(percent);
              
              return (
                <div key={r.pin} className="room-item">
                  <div className="room-header">
                    <div className="room-info">
                      <span className="room-pin">PIN: <strong>{r.pin}</strong></span>
                      <Badge 
                        value={`${r.count}/${r.limit}`} 
                        severity={percent >= 80 ? "danger" : percent >= 50 ? "warning" : "success"} 
                        className="capacity-badge"
                      />
                    </div>
                    <Button
                      icon="pi pi-sign-in"
                      className="p-button-rounded join-btn"
                      tooltip="Unirse a esta sala"
                      tooltipOptions={{ position: 'left' }}
                      onClick={() => navigate('/join', { state: { pin: r.pin } })}
                    />
                  </div>
                  
                  <div className="progress-container">
                    <ProgressBar 
                      value={percent} 
                      showValue={false} 
                      style={{ height: '8px', backgroundColor: 'var(--surface-200)' }}
                      color={capacityColor}
                    />
                    <div className="capacity-text" style={{ color: capacityColor }}>
                      {percent}% ocupado
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="create-section">
          <div className="divider">
            <span>Crear nueva sala</span>
          </div>
          
          <div className="controls-container">
            <div className="limit-control">
              <label htmlFor="limitInput" className="control-label">
                <i className="pi pi-users mr-2"></i>
                Límite de participantes
              </label>
              <div className="input-with-info">
                <InputNumber
                  id="limitInput"
                  value={limit}
                  onValueChange={e => setLimit(e.value!)}
                  min={2}
                  max={20}
                  showButtons
                  buttonLayout="horizontal"
                  decrementButtonClassName="p-button-outlined"
                  incrementButtonClassName="p-button-outlined"
                  incrementButtonIcon="pi pi-plus"
                  decrementButtonIcon="pi pi-minus"
                  disabled={!isHost}
                  tooltip={!isHost ? 'Solo el anfitrión puede ajustar el límite' : undefined}
                  tooltipOptions={{ position: 'top' }}
                  className="limit-input"
                />
                {!isHost && (
                  <div className="host-warning">
                    <i className="pi pi-lock mr-1"></i>
                    Acceso solo para anfitrión
                  </div>
                )}
              </div>
            </div>
            
            <div className="actions">
              <Button
                label="Crear Sala"
                icon="pi pi-plus-circle"
                className="p-button-lg create-btn"
                disabled={!isHost}
                onClick={handleCreate}
                tooltip={!isHost ? 'Solo el anfitrión puede crear salas' : 'Crear una nueva sala de chat'}
                tooltipOptions={{ position: 'bottom' }}
              />
              
              <Button
                label="Unirse a Sala"
                icon="pi pi-sign-in"
                className="p-button-lg p-button-outlined join-room-btn"
                onClick={() => navigate('/join')}
                tooltip="Unirse a una sala con PIN"
                tooltipOptions={{ position: 'bottom' }}
              />
            </div>
          </div>
        </div>
      </Card>
      
      <div className="info-footer">
        <div className="info-item">
          <i className="pi pi-info-circle"></i>
          <span>El anfitrión puede crear hasta 5 salas simultáneas</span>
        </div>
        <div className="info-item">
          <i className="pi pi-refresh"></i>
          <span>Los datos se actualizan automáticamente cada 5 segundos</span>
        </div>
      </div>
    </div>
  );
};

export default RoomList;