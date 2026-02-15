import { useEffect, useRef } from 'react';
import { Viewer } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';

function MapillaryView({ imageId }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    const accessToken = import.meta.env.VITE_MAPILLARY_CLIENT_TOKEN;

    if (!accessToken || !containerRef.current) return;

    const viewer = new Viewer({
      accessToken,
      container: containerRef.current,
      imageId: imageId || undefined,
    });

    viewerRef.current = viewer;

    return () => {
      viewer.remove();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (viewerRef.current && imageId) {
      viewerRef.current.moveTo(imageId).catch((err) => {
        console.warn('Mapillary moveTo failed:', err);
      });
    }
  }, [imageId]);

  const accessToken = import.meta.env.VITE_MAPILLARY_CLIENT_TOKEN;

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800 text-white">
        <div className="text-center p-4">
          <p className="text-lg font-bold mb-2">Mapillary トークンが未設定です</p>
          <p className="text-sm text-gray-400">
            .env ファイルに VITE_MAPILLARY_CLIENT_TOKEN を設定してください
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}

function StaticImageView({ imageUrl }) {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <img
        src={imageUrl}
        alt="この場所はどこ？"
        className="max-w-full max-h-full object-contain"
        draggable={false}
      />
    </div>
  );
}

export default function PanoramaViewer({ location }) {
  if (location.type === 'static') {
    return <StaticImageView imageUrl={location.imageUrl} />;
  }

  return <MapillaryView imageId={location.imageId} />;
}
