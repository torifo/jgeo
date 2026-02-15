import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, LayersControl, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const correctIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'correct-marker',
});

function MapClickHandler({ onMapClick, disabled }) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function AnswerMap({ onGuess, disabled, correctPosition, guessPosition, extraMarkers = [] }) {
  const [markerPos, setMarkerPos] = useState(null);

  const handleMapClick = (latlng) => {
    setMarkerPos(latlng);
    onGuess({ lat: latlng.lat, lng: latlng.lng });
  };

  const displayMarker = guessPosition
    ? L.latLng(guessPosition.lat, guessPosition.lng)
    : markerPos;

  return (
    <MapContainer
      center={[36.5, 137.5]}
      zoom={5}
      className="w-full h-full"
      style={{ minHeight: '200px' }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="国土地理院（標準）">
          <TileLayer
            attribution='&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
            url="https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="国土地理院（淡色）">
          <TileLayer
            attribution='&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
            url="https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <MapClickHandler onMapClick={handleMapClick} disabled={disabled} />
      {displayMarker && <Marker position={displayMarker} />}
      {correctPosition && (
        <Marker
          position={[correctPosition.lat, correctPosition.lng]}
          icon={correctIcon}
        />
      )}
      {displayMarker && correctPosition && (
        <Polyline
          positions={[
            [displayMarker.lat, displayMarker.lng],
            [correctPosition.lat, correctPosition.lng],
          ]}
          color="red"
          dashArray="10"
        />
      )}
      {extraMarkers.map((m, i) => (
        <CircleMarker
          key={i}
          center={[m.position.lat, m.position.lng]}
          radius={8}
          pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.8 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            {m.label}
          </Tooltip>
        </CircleMarker>
      ))}
      {extraMarkers.map((m, i) =>
        correctPosition ? (
          <Polyline
            key={`line-${i}`}
            positions={[
              [m.position.lat, m.position.lng],
              [correctPosition.lat, correctPosition.lng],
            ]}
            color={m.color}
            dashArray="6"
            opacity={0.6}
          />
        ) : null
      )}
    </MapContainer>
  );
}
