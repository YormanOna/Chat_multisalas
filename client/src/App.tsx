import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoomList from './components/RoomList';
import JoinRoom from './components/JoinRoom';
import ChatRoom from './components/ChatRoom';

const App: React.FC = () => (
  <div className="container py-4">
    <Routes>
      <Route path="/" element={<RoomList />} />
      <Route path="/join" element={<JoinRoom />} />
      <Route path="/chat/:pin" element={<ChatRoom />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>
);

export default App;
