import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../components/Login';
import InterestForm from '../components/InterestForm';
import Chat from '../components/Chat';
import VideoChat from '../components/VideoChat';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/interests"
        element={
          <PrivateRoute>
            <InterestForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        }
      />
      <Route
        path="/video/:roomId"
        element={
          <PrivateRoute>
            <VideoChat />
          </PrivateRoute>
        }
      />
      <Route path="/chat/:roomId" element={<Chat />} />
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default AppRoutes; 