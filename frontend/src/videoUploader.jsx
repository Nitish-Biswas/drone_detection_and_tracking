import React, { useState, useRef, useEffect } from 'react';

function VideoUploader() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoDetails, setVideoDetails] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadVideoRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setError(null);

    if (!file) return;

    // Check if the file is a video
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file (e.g., MP4, WebM).');
      return;
    }

    // Revoke previous object URL to avoid memory leaks
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }

    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoDetails({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    setIsCameraOn(false);
  };

  // Detect if the video can play
  const handleVideoLoaded = () => {
    setError(null);
  };

  const handleVideoError = () => {
    setError(
      'Failed to play the video. The file may be corrupted or in an unsupported format. Try MP4 (H.264 codec).'
    );
    setVideoSrc(null);
    setVideoDetails(null);
  };

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('Got stream:', stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Set srcObject on videoRef:', videoRef.current);
        // No need to call play() here, browser will handle it with autoPlay
      }
      setVideoSrc(null);
      setVideoDetails(null);
      setIsCameraOn(true);
    } catch (err) {
      setError('Unable to access camera: ' + err.message);
    }
  };

  const handleStopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  useEffect(() => {
    if (isCameraOn && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          setError('Unable to access camera: ' + err.message);
        });
    }
    // Cleanup
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraOn]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Upload and Play Video / Use Camera</h2>
      
      <div style={{ margin: '10px' }}>
        <input
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current.click()}>
          Select Video File
        </button>
      </div>

      <div style={{ margin: '10px' }}>
        {!isCameraOn ? (
          <button onClick={handleStartCamera}>Turn On Camera</button>
        ) : (
          <button onClick={handleStopCamera}>Turn Off Camera</button>
        )}
      </div>

      {error && (
        <div style={{ color: 'red', margin: '10px' }}>
          {error}
        </div>
      )}

      {videoSrc && (
        <div style={{ marginTop: '20px' }}>
          <video
            ref={uploadVideoRef}
            src={videoSrc}
            controls
            autoPlay
            muted
            onCanPlay={handleVideoLoaded}
            onError={handleVideoError}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          <div style={{ marginTop: '10px', textAlign: 'left' }}>
            <p><strong>Name:</strong> {videoDetails.name}</p>
            <p><strong>Size:</strong> {(videoDetails.size / (1024 * 1024)).toFixed(2)} MB</p>
            <p><strong>Type:</strong> {videoDetails.type}</p>
          </div>
        </div>
      )}

      {isCameraOn && (
        <div style={{ marginTop: '20px' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      )}
    </div>
  );
}

export default VideoUploader;