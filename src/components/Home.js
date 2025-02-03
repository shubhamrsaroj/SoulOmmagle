import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container } from '@mui/material';

const Home = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle, rgba(18,18,62,1) 0%, rgba(10,10,45,1) 100%)',
        color: '#fff',
        textAlign: 'center',
        padding: 4,
      }}
    >
      <Container 
        maxWidth="sm" 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '12px', 
          padding: 4, 
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <Typography 
          variant="h2" 
          component="h1" 
          fontWeight="bold" 
          gutterBottom 
          sx={{ fontSize: '2.8rem', letterSpacing: '1px', color: '#ff80ab' }}
        >
          SoulMagle
        </Typography>

        <Typography variant="h6" mb={4} sx={{ fontSize: '1.2rem', opacity: 0.9 }}>
          Connect with kindred spirits through meaningful conversations.
        </Typography>

        <Button
          variant="contained"
          size="large"
          sx={{
            backgroundColor: '#ff4081',
            color: '#fff',
            px: 5,
            py: 1.5,
            fontSize: '1.3rem',
            textTransform: 'none',
            borderRadius: '10px',
            boxShadow: '0px 4px 15px rgba(255, 64, 129, 0.4)',
            transition: 'all 0.3s',
            '&:hover': {
              backgroundColor: '#f50057',
              transform: 'scale(1.07)',
              boxShadow: '0px 6px 20px rgba(255, 64, 129, 0.5)',
            },
          }}
          onClick={() => navigate('/interests')}
        >
          Find Matches
        </Button>
      </Container>
    </Box>
  );
};

export default Home;
