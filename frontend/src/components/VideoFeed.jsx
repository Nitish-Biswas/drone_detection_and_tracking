import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, Alert } from '@mui/material'
import { VideocamOff, Videocam } from '@mui/icons-material'
import { getVideoStreamUrl } from '../services/api'

const VideoFeed = ({ cameraStatus }) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef(null)
  const retryTimeoutRef = useRef(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 5

  const videoUrl = getVideoStreamUrl()

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
    setRetryCount(0)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
    
    // Retry loading the image if camera is supposed to be running
    if (cameraStatus.is_running && retryCount < maxRetries) {
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1)
        setImageError(false)
        if (imgRef.current) {
          imgRef.current.src = `${videoUrl}?t=${Date.now()}`
        }
      }, 3000)
    }
  }

  // Update image source when camera status changes
  useEffect(() => {
    if (imgRef.current) {
      if (cameraStatus.is_running) {
        setImageError(false)
        setRetryCount(0)
        imgRef.current.src = `${videoUrl}?t=${Date.now()}`
      } else {
        setImageError(false)
        setImageLoaded(false)
      }
    }
  }, [cameraStatus.is_running, videoUrl])

  // Cleanup retry timeout
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const renderVideoContent = () => {
    if (!cameraStatus.is_running) {
      return (
        <Box 
          className="video-overlay"
          sx={{
            background: 'linear-gradient(45deg, #1a1a1a 0%, #2d2d2d 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            minHeight: 400,
          }}
        >
          <VideocamOff sx={{ fontSize: 60, color: '#666' }} />
          <Typography variant="h6" color="text.secondary">
            Camera is stopped
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "Start Camera" to begin drone tracking
          </Typography>
        </Box>
      )
    }

    if (imageError && retryCount >= maxRetries) {
      return (
        <Box 
          className="video-overlay"
          sx={{
            background: 'linear-gradient(45deg, #d32f2f 0%, #f44336 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            minHeight: 400,
          }}
        >
          <VideocamOff sx={{ fontSize: 60, color: 'white' }} />
          <Typography variant="h6" color="white">
            Camera connection failed
          </Typography>
          <Typography variant="body2" color="white">
            Please check your camera connection and try restarting
          </Typography>
        </Box>
      )
    }

    if (cameraStatus.is_running && !imageLoaded && !imageError) {
      return (
        <Box 
          className="video-overlay"
          sx={{
            background: 'linear-gradient(45deg, #1976d2 0%, #2196f3 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            minHeight: 400,
          }}
        >
          <Videocam sx={{ fontSize: 60, color: 'white' }} />
          <Typography variant="h6" color="white">
            Initializing camera...
          </Typography>
          <Typography variant="body2" color="white">
            Please wait while the video feed loads
          </Typography>
          {retryCount > 0 && (
            <Typography variant="caption" color="white">
              Retry attempt {retryCount}/{maxRetries}
            </Typography>
          )}
        </Box>
      )
    }

    return (
      <img
        ref={imgRef}
        src={videoUrl}
        alt="Drone Detection Video Feed"
        className="video-feed"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '600px',
          objectFit: 'contain',
          display: imageLoaded ? 'block' : 'none'
        }}
      />
    )
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Status Alert */}
      {cameraStatus.is_running && (
        <Alert 
          severity={imageError ? "error" : imageLoaded ? "success" : "info"} 
          sx={{ mb: 2 }}
        >
          {imageError && retryCount >= maxRetries && "Camera connection failed - please restart"}
          {imageError && retryCount < maxRetries && `Reconnecting... (attempt ${retryCount}/${maxRetries})`}
          {!imageError && imageLoaded && "Camera is running - Live video feed active"}
          {!imageError && !imageLoaded && cameraStatus.is_running && "Connecting to video feed..."}
        </Alert>
      )}
      
      {/* Video Container */}
      <Box 
        className="video-container"
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: '#000',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          minHeight: 400,
        }}
      >
        {/* Status Indicator */}
        <Box
          className="video-status"
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: cameraStatus.is_running ? 'success.main' : 'error.main',
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            zIndex: 10,
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {cameraStatus.is_running ? '🔴 LIVE' : '⏹ STOPPED'}
        </Box>

        {/* Detection Counter */}
        {cameraStatus.total_detections_today > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              zIndex: 10,
              fontSize: '0.875rem',
            }}
          >
            🚁 {cameraStatus.total_detections_today} detected today
          </Box>
        )}

        {renderVideoContent()}
      </Box>
      
      {/* Additional Info */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
        {cameraStatus.message}
      </Typography>
    </Box>
  )
}

export default VideoFeed