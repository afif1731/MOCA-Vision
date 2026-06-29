import type { VideoHTMLAttributes } from 'react';

interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  path: string;
}

export function Video({ path, ...props }: VideoProps) {
  const isFullUrl = path.startsWith('http://') || path.startsWith('https://');
  const videoUrl = isFullUrl ? path : `${import.meta.env.VITE_API_URL}/uploads/${path}`;

  return (
    <video {...props}>
      <source src={videoUrl} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}
