import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Fade
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import VideoChatIcon from '@mui/icons-material/VideoChat';
import PeopleIcon from '@mui/icons-material/People';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        navigate(redirectPath);
      } else {
        navigate('/');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        navigate(redirectPath);
      } else {
        navigate('/');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A1929 0%, #001E3C 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background elements */}
      <Box className="animated-bg" />
      
      <Container maxWidth="md" sx={{ mt: 8, mb: 4, position: 'relative', zIndex: 2 }}>
        <Fade in timeout={1000}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '3rem', md: '4.5rem' },
                fontWeight: 800,
                background: 'linear-gradient(45deg, #6C63FF, #FF3366)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 2
              }}
            >
              SoulMagle
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 300,
                mb: 4
              }}
            >
              Connect with kindred spirits through meaningful conversations
            </Typography>
          </Box>
        </Fade>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
            gap: 4,
            mb: 6
          }}
        >
          {/* Feature cards */}
          <FeatureCard
            icon={<VideoChatIcon sx={{ fontSize: 40 }} />}
            title="Video Chat"
            description="Connect face-to-face with people who share your interests"
          />
          <FeatureCard
            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
            title="Smart Matching"
            description="Our AI matches you with like-minded individuals"
          />
          <FeatureCard
            icon={<FavoriteIcon sx={{ fontSize: 40 }} />}
            title="Meaningful Connections"
            description="Build genuine connections based on shared passions"
          />
        </Box>

        <Paper
          elevation={24}
          sx={{
            maxWidth: 'sm',
            mx: 'auto',
            p: 4,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              py: 2,
              bgcolor: '#fff',
              color: '#333',
              '&:hover': {
                bgcolor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)'
              },
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 500,
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              'Start Chatting with Google'
            )}
          </Button>

          <Typography
            variant="body2"
            sx={{
              mt: 4,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => (
  <Paper
    elevation={8}
    sx={{
      p: 3,
      textAlign: 'center',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'transform 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)'
      }
    }}
  >
    <Box sx={{ color: '#6C63FF', mb: 2 }}>{icon}</Box>
    <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
      {description}
    </Typography>
  </Paper>
);

export default Login; 