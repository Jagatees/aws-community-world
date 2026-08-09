import MapboxGlobeScene from './MapboxGlobeScene';
import './GeoLibreScene.css';

export default function GeoLibreScene(props) {
  return (
    <section className="geolibre-scene" aria-label="GeoLibre community globe">
      <MapboxGlobeScene {...props} variant="geolibre" />
    </section>
  );
}
