import React from 'react';

interface VideoPlayerProps {
  src: string;
  poster: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  poster, 
  width = "100%", 
  height = "auto",
  className = "",
  autoPlay = true,
  muted = true,
  loop = false,
  controls = false
}) => {
  return (
    <div className={`video-container ${className}`}>
      <video
        width={width}
        height={height}
        poster={poster}
        preload="metadata"
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        className="rounded-lg shadow-lg border-2 border-emerald-900 bg-slate-900"
      >
        <source src={src} type="video/mp4" />
        <p className="text-emerald-600 p-4">
          Your browser does not support the video tag.
        </p>
      </video>
    </div>
  );
};

export default VideoPlayer;