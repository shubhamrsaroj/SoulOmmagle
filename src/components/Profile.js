import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  Button,
  Divider,
  Grid,
  IconButton,
  Fade,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import VideoChatIcon from '@mui/icons-material/VideoChat';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InterestsIcon from '@mui/icons-material/Interests';

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [userStats, setUserStats] = useState({
    chats: 0,
    matches: 0,
    hours: 0
  });

  // Load user-specific data
  useEffect(() => {
    if (currentUser) {
      // Load user interests from session storage
      const savedInterests = sessionStorage.getItem(`interests_${currentUser.uid}`);
      if (savedInterests) {
        currentUser.interests = JSON.parse(savedInterests);
      }

      // Load user stats from session storage
      const savedStats = sessionStorage.getItem(`stats_${currentUser.uid}`);
      if (savedStats) {
        setUserStats(JSON.parse(savedStats));
      }
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      // Clear session storage before logout
      sessionStorage.clear();
      await logout();
      navigate('/login');
    } catch (error) {
      setError('Failed to log out');
    }
  };

  const handleStartChat = () => {
    navigate('/interests');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A1929 0%, #001E3C 100%)',
        py: 4
      }}
    >
      <Container maxWidth="md">
        <Fade in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden'
            }}
          >
            {error && (
              <Alert severity="error" sx={{ m: 2 }}>
                {error}
              </Alert>
            )}
            
            {/* Profile Header */}
            <Box
              sx={{
                p: 4,
                background: 'linear-gradient(45deg, rgba(108, 99, 255, 0.2), rgba(255, 51, 102, 0.2))',
                textAlign: 'center',
                position: 'relative'
              }}
            >
              <IconButton
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: 16,
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
                onClick={handleLogout}
              >
                <LogoutIcon />
              </IconButton>

              <Avatar
                src={currentUser?.photoURL}
                sx={{
                  width: 120,
                  height: 120,
                  margin: '0 auto',
                  border: '4px solid #6C63FF',
                  boxShadow: '0 4px 14px rgba(108, 99, 255, 0.4)'
                }}
              />
              <Typography
                variant="h4"
                sx={{
                  mt: 2,
                  fontWeight: 700,
                  color: '#fff'
                }}
              >
                {currentUser?.displayName}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  mb: 3
                }}
              >
                {currentUser?.email}
              </Typography>

              <Grid container spacing={3} justifyContent="center">
                {userStats.chats && (
                  <Grid item>
                    <Box
                      sx={{
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.9)'
                      }}
                    >
                      <Box sx={{ color: '#6C63FF', mb: 1 }}>
                        <VideoChatIcon />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {userStats.chats}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Chats
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {userStats.matches && (
                  <Grid item>
                    <Box
                      sx={{
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.9)'
                      }}
                    >
                      <Box sx={{ color: '#6C63FF', mb: 1 }}>
                        <PeopleIcon />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {userStats.matches}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Matches
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {userStats.hours && (
                  <Grid item>
                    <Box
                      sx={{
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.9)'
                      }}
                    >
                      <Box sx={{ color: '#6C63FF', mb: 1 }}>
                        <AccessTimeIcon />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {userStats.hours}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Hours
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>

            <Box sx={{ p: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <InterestsIcon /> Your Interests
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 4
                }}
              >
                {currentUser?.interests?.map((interest, index) => (
                  <Chip
                    key={index}
                    label={interest}
                    sx={{
                      bgcolor: 'rgba(108, 99, 255, 0.1)',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: 'rgba(108, 99, 255, 0.2)'
                      }
                    }}
                  />
                ))}
              </Box>

              <Button
                variant="contained"
                startIcon={<VideoChatIcon />}
                fullWidth
                onClick={handleStartChat}
                sx={{
                  py: 2,
                  bgcolor: '#6C63FF',
                  '&:hover': {
                    bgcolor: '#5B52FF',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 12px rgba(108, 99, 255, 0.2)'
                  },
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  borderRadius: '12px',
                  transition: 'all 0.3s ease'
                }}
              >
                Start New Chat
              </Button>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Profile; 