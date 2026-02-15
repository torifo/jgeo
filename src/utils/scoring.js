import { distance } from '@turf/distance';

export function calculateDistance(guessLat, guessLng, answerLat, answerLng) {
  const from = [guessLng, guessLat];
  const to = [answerLng, answerLat];
  return distance(from, to, { units: 'kilometers' });
}

export function calculateScore(distanceKm) {
  return Math.round(5000 * Math.exp(-distanceKm / 2000));
}
