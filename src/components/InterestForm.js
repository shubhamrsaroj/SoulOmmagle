import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  LinearProgress,
  Fade,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import InterestsIcon from '@mui/icons-material/Interests';
import VideoChatIcon from '@mui/icons-material/VideoChat';

const InterestForm = () => {
  const { emit, on, off, isConnected } = useSocket();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const interests = [
    'Gaming', 'Music', 'Movies', 'Sports', 'Travel',
    'Food', 'Art', 'Technology', 'Books', 'Fashion',
    'Photography', 'Fitness', 'Cooking', 'Dance', 'Writing',
    'Nature', 'Science', 'History', 'Languages', 'Pets'
  ];

  useEffect(() => {
    if (!isConnected) return;

    const handleMatchFound = ({ matchedUserId, commonInterests, roomId }) => {
      console.log('Match found:', { matchedUserId, commonInterests, roomId });
      navigate(`/chat/${roomId}`);
    };

    on('match-found', handleMatchFound);

    // Listen for when interests are saved
    on('interestsSaved', (response) => {
      if (!response.success) {
        console.error('Failed to save interests:', response.error);
        setError('Failed to save interests. Please try again.');
        setIsSearching(false);
        setLoading(false);
      }
    });

    // Listen for no match
    on('noMatch', ({ message }) => {
      console.log('No match found:', message);
      setError(message || 'No match found at the moment. Please try again.');
      setIsSearching(false);
      setLoading(false);
    });

    // Listen for errors
    on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'An error occurred');
      setIsSearching(false);
      setLoading(false);
    });

    return () => {
      off('match-found', handleMatchFound);
      off('interestsSaved');
      off('noMatch');
      off('error');
    };
  }, [isConnected, navigate, on, off]);

  const handleInterestChange = (interest) => {
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      } else {
        return [...prev, interest];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConnected) {
      console.error('Socket not connected');
      return;
    }

    setLoading(true);
    emit('register-user', {
      userId: currentUser.uid,
      interests: selectedInterests
    });
  };

  // Cancel matching when component unmounts
  useEffect(() => {
    return () => {
      if (isConnected && isSearching) {
        emit('cancelMatch', { userId: currentUser.uid });
      }
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [isConnected, isSearching, currentUser, emit, searchTimeout]);

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
              p: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar
                src={currentUser?.photoURL}
                sx={{ 
                  width: 80, 
                  height: 80, 
                  margin: '0 auto',
                  mb: 2,
                  border: '3px solid #6C63FF'
                }}
              />
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #6C63FF, #FF3366)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  mb: 1
                }}
              >
                Select Your Interests
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}
              >
                Choose up to 5 interests to find your perfect match
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ mb: 3 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(selectedInterests.length / 5) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#6C63FF'
                    }
                  }}
                />
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
                  {selectedInterests.length}/5 interests selected
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'center',
                mb: 4
              }}
            >
              {interests.map((interest) => (
                <FormControlLabel
                  key={interest}
                  control={
                    <Checkbox
                      checked={selectedInterests.includes(interest)}
                      onChange={() => handleInterestChange(interest)}
                    />
                  }
                  label={interest}
                />
              ))}
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleSubmit}
              disabled={loading || selectedInterests.length === 0}
              startIcon={isSearching ? null : <VideoChatIcon />}
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
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: '#fff' }} />
                  {isSearching ? 'Finding Your Match...' : 'Processing...'}
                </>
              ) : (
                'Continue to Chat'
              )}
            </Button>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default InterestForm;