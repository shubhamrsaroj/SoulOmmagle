import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoChat from './VideoChat';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { useSocket } from '../context/SocketContext';

const Chat = () => {
  const { roomId } = useParams();
  const { currentUser } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleStartVideo = () => {
    setShowVideo(true);
  };

  const handleEndChat = () => {
    // Only navigate back to interests if user explicitly ends chat
    navigate('/interests');
  };

  if (!isConnected) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography>Connecting to server...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/interests')}
          sx={{ mt: 2 }}
        >
          Return to Matching
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', bgcolor: '#f5f5f5' }}>
      {showVideo ? (
        <VideoChat 
          roomId={roomId} 
          onLeave={handleEndChat}
        />
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          p: 3
        }}>
          <Typography variant="h5" gutterBottom>
            Ready to Start Chat
          </Typography>
          <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
            You've been matched! Click below to start video chat.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleStartVideo}
            size="large"
          >
            Start Video Chat
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Chat; 