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

    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file (e.g., MP4, WebM).');
      return;
    }

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
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      const obsDevice = videoDevices.find((d) => d.label.includes('OBS'));

      if (!obsDevice) {
        setError('OBS Virtual Camera not found. Please start OBS Virtual Camera.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: obsDevice.deviceId } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setVideoSrc(null);
      setVideoDetails(null);
      setIsCameraOn(true);
      setError(null);
    } catch (err) {
      setError('Unable to access OBS Virtual Camera: ' + err.message);
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
    return () => {
      handleStopCamera();
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>
      <h2>Upload and Play Video / Use OBS Camera</h2>

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
          <button onClick={handleStartCamera}>Turn On OBS Camera</button>
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
