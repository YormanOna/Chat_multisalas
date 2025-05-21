import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { io } from 'socket.io-client';
import { getDeviceId } from '../utils/device';
import '../styles/JoinRoom.css'; // Asegúrate de crear este archivo CSS

interface JoinResponse { 
  success: boolean; 
  message?: string; 
}

const SERVER_URL = process.env.REACT_APP_SERVER_URL!;

const JoinRoom: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prePin = (location.state as any)?.pin as string | undefined;
  const [pin, setPin] = useState(prePin || '');
  const [nickname, setNickname] = useState('');
  const toast = useRef<Toast>(null);
  const deviceId = getDeviceId();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Animación de aparición cuando el componente se monta
    document.querySelector('.join-room-container')?.classList.add('appear');
  }, []);

  const join = () => {
    if (!pin.trim() || !nickname.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Campos incompletos',
        detail: 'Debes ingresar PIN y nickname.',
        life: 3000
      });
      return;
    }

    setIsLoading(true);
    const socket = io(SERVER_URL, { query: { deviceId } });
    
    socket.emit(
      'join_room',
      { pin: pin.trim(), nickname: nickname.trim() },
      ({ success, message }: JoinResponse) => {
        socket.disconnect();
        setIsLoading(false);
        
        if (success) {
          navigate(`/chat/${pin.trim()}`, {
            state: { nickname: nickname.trim(), isHost: false }
          });
        } else {
          toast.current?.show({
            severity: 'error',
            summary: 'Error al unirse',
            detail: message || 'No se pudo unir a la sala.',
            life: 3000
          });
        }
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      join();
    }
  };

  const header = (
    <div className="join-header">
      <div className="join-header-icon">
        <i className="pi pi-comments" style={{ fontSize: '2rem' }}></i>
      </div>
      <h3>Unirse a Sala</h3>
    </div>
  );

  const footer = (
    <div className="mt-3 text-center join-footer">
      <Button
        label={isLoading ? "Conectando..." : "Unirse ahora"}
        icon={isLoading ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
        className="p-button-lg join-button"
        onClick={join}
        disabled={isLoading}
      />
      <p className="mt-3 join-info-text">
        <i className="pi pi-info-circle"></i> Ingresa el PIN proporcionado por el anfitrión
      </p>
    </div>
  );

  return (
    <div className="join-room-container">
      <div className="join-room-background"></div>
      <Toast ref={toast} />
      
      <Card className="join-room-card" header={header} footer={footer}>
        <div className="p-fluid">
          <div className="field">
            <label htmlFor="pinInput" className="field-label">
              <i className="pi pi-key"></i>
              <span>PIN de la sala</span>
            </label>
            <InputText
              id="pinInput"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="join-input"
              onKeyPress={handleKeyPress}
              placeholder="Ingresa el PIN"
            />
          </div>
          
          <div className="field mt-4">
            <label htmlFor="nickInput" className="field-label">
              <i className="pi pi-user"></i>
              <span>Tu nickname</span>
            </label>
            <InputText
              id="nickInput"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="join-input"
              onKeyPress={handleKeyPress}
              placeholder="Ingresa tu nombre"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default JoinRoom;