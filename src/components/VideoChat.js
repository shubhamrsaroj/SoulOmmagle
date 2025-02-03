import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  IconButton,
  TextField,
  Drawer,
  useTheme,
  Fade,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  CallEnd,
  Chat as ChatIcon,
  Send,
  Close as CloseIcon,
  ScreenShare,
  StopScreenShare
} from '@mui/icons-material';

const VideoChat = ({ roomId, onLeave }) => {
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const { socket, isConnected, emit, on, off } = useSocket();
  const { currentUser } = useAuth();
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const messageData = {
      roomId,
      message: newMessage.trim(),
      sender: currentUser?.displayName || 'You',
      timestamp: new Date().toISOString()
    };
    
    // Emit the message to the server
    emit('chat-message', messageData);

    // Add message to local state immediately
    setMessages(prev => [...prev, {
      text: messageData.message,
      sender: 'You',
      timestamp: messageData.timestamp,
      isSelf: true
    }]);

    setNewMessage('');
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh'
      }
    ]
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Error getting user media:', err);
      setError('Could not access camera/microphone');
      throw err;
    }
  };

  const createPeerConnection = async () => {
    try {
      console.log('Creating peer connection...');
      const pc = new RTCPeerConnection(configuration);
      
      // Add local stream tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
          console.log('Added track to peer connection:', track.kind);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          emit('ice-candidate', {
            candidate: event.candidate,
            roomId
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state changed:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnecting(false);
          console.log('Peer connection established!');
        }
      };

      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setIsConnecting(false);
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    } catch (err) {
      console.error('Error creating peer connection:', err);
      setError('Failed to create peer connection');
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initConnection = async () => {
      if (!isConnected || !roomId) return;

      try {
        console.log('Initializing connection for room:', roomId);
        await startLocalStream();
        console.log('Local stream started');
        
        emit('join-room', { roomId });
        console.log('Joined room:', roomId);

        // Handle start signaling
        on('start-signaling', async ({ peers }) => {
          console.log('Received start-signaling with peers:', peers);
          if (!mounted) return;
          await createPeerConnection();
        });

        // Handle ready to connect
        on('ready-to-connect', async ({ isInitiator }) => {
          console.log('Ready to connect, isInitiator:', isInitiator);
          if (!mounted) return;

          try {
            const pc = peerConnectionRef.current || await createPeerConnection();
            
            if (isInitiator) {
              console.log('Creating offer as initiator');
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              console.log('Sending offer');
              emit('offer', { offer, roomId });
            }
          } catch (err) {
            console.error('Error in ready-to-connect:', err);
            setError('Failed to start connection');
          }
        });

        // Handle offer
        on('offer', async ({ offer }) => {
          console.log('Received offer');
          try {
            const pc = peerConnectionRef.current || await createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            console.log('Creating answer');
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('Sending answer');
            emit('answer', { answer, roomId });
          } catch (err) {
            console.error('Error handling offer:', err);
            setError('Failed to handle offer');
          }
        });

        // Handle answer
        on('answer', async ({ answer }) => {
          console.log('Received answer');
          try {
            const pc = peerConnectionRef.current;
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              console.log('Set remote description from answer');
            }
          } catch (err) {
            console.error('Error handling answer:', err);
            setError('Failed to handle answer');
          }
        });

        // Handle ICE candidate
        on('ice-candidate', async ({ candidate }) => {
          console.log('Received ICE candidate');
          try {
            const pc = peerConnectionRef.current;
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log('Added ICE candidate');
            }
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        });

        // Handle peer left
        on('peer-left', () => {
          console.log('Peer left');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          setIsConnecting(true);
        });

        // Add chat message handler
        on('chat-message', ({ message, sender, timestamp }) => {
          console.log('Received chat message:', message, 'from:', sender);
          setMessages(prev => [...prev, {
            text: message,
            sender: sender,
            timestamp: timestamp,
            isSelf: false
          }]);
          
          if (!isChatOpen) {
            setUnreadMessages(prev => prev + 1);
          }
        });

      } catch (err) {
        console.error('Error in connection initialization:', err);
        if (mounted) {
          setError('Failed to initialize video chat');
        }
      }
    };

    initConnection();

    // Cleanup
    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        console.log('Closed peer connection');
      }
      
      ['start-signaling', 'ready-to-connect', 'offer', 'answer', 'ice-candidate', 'peer-left'].forEach(event => {
        off(event);
      });
      
      emit('leave-room', { roomId });
      console.log('Left room:', roomId);
      off('chat-message');
    };
  }, [isConnected, roomId, emit, on, off, isChatOpen]);

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    onLeave();
  };

  return (
    <Box sx={{ 
      height: '100vh',
      bgcolor: 'background.default',
      position: 'relative',
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`
    }}>
      <Box sx={{ 
        display: 'flex',
        height: 'calc(100vh - 80px)',
        p: 2,
        gap: 2,
        transition: 'all 0.3s ease'
      }}>
        <Box sx={{ 
          flex: isChatOpen ? '0 0 65%' : '0 0 100%',
          display: 'flex',
          gap: 2,
          transition: 'all 0.3s ease'
        }}>
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: theme.shadows[8]
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)'
              }}
            />
            <Typography
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.6)',
                px: 2,
                py: 0.5,
                borderRadius: 2
              }}
            >
              You
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: theme.shadows[8]
          }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <Typography
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.6)',
                px: 2,
                py: 0.5,
                borderRadius: 2
              }}
            >
              Peer
            </Typography>
          </Box>
        </Box>

        <Drawer
          variant="persistent"
          anchor="right"
          open={isChatOpen}
          sx={{
            width: '35%',
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: '35%',
              position: 'relative',
              border: 'none',
              bgcolor: 'background.paper',
              borderRadius: 4,
              boxShadow: theme.shadows[8]
            }
          }}
        >
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            p: 2
          }}>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Typography variant="h6">Chat</Typography>
              <IconButton onClick={() => setIsChatOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Box sx={{ 
              flexGrow: 1,
              overflowY: 'auto',
              mb: 2,
              px: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    alignSelf: msg.isSelf ? 'flex-end' : 'flex-start',
                    maxWidth: '80%'
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      bgcolor: msg.isSelf ? theme.palette.primary.main : 'grey.100',
                      color: msg.isSelf ? 'white' : 'text.primary',
                      borderRadius: msg.isSelf ? '20px 20px 4px 20px' : '20px 20px 20px 4px'
                    }}
                  >
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      mt: 0.5,
                      display: 'block',
                      textAlign: msg.isSelf ? 'right' : 'left',
                      color: 'text.secondary'
                    }}
                  >
                    {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ 
              display: 'flex',
              gap: 1,
              p: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}>
              <TextField
                fullWidth
                size="small"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '20px'
                  }
                }}
              />
              <IconButton 
                color="primary"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Send />
              </IconButton>
            </Box>
          </Box>
        </Drawer>
      </Box>

      {/* Control Bar */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2,
        gap: 2,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <Tooltip title={isAudioEnabled ? 'Mute' : 'Unmute'}>
          <IconButton 
            onClick={toggleAudio}
            sx={{ 
              bgcolor: isAudioEnabled ? 'primary.main' : 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: isAudioEnabled ? 'primary.dark' : 'error.dark'
              }
            }}
          >
            {isAudioEnabled ? <Mic /> : <MicOff />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}>
          <IconButton 
            onClick={toggleVideo}
            sx={{ 
              bgcolor: isVideoEnabled ? 'primary.main' : 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: isVideoEnabled ? 'primary.dark' : 'error.dark'
              }
            }}
          >
            {isVideoEnabled ? <Videocam /> : <VideocamOff />}
          </IconButton>
        </Tooltip>

        <Tooltip title="End call">
          <IconButton 
            onClick={onLeave}
            sx={{ 
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark'
              }
            }}
          >
            <CallEnd />
          </IconButton>
        </Tooltip>

        <Tooltip title={isChatOpen ? 'Close chat' : 'Open chat'}>
          <IconButton 
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              setUnreadMessages(0);
            }}
            sx={{ 
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          >
            <Badge badgeContent={unreadMessages} color="error">
              <ChatIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>

      {isConnecting && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.7)',
          zIndex: 1000
        }}>
          <Paper sx={{
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
            bgcolor: 'background.paper'
          }}>
            <Typography variant="h6" gutterBottom>
              Waiting for peer...
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Share your screen or start a conversation when connected
            </Typography>
            <Fade in={true}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <div className="loader" />
              </Box>
            </Fade>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default VideoChat;