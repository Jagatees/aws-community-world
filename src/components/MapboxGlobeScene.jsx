import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as maplibregl from 'maplibre-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createNewMemberBadgeElement, getCountryFlagUrl, getMemberBadgeLabel, getMemberCountry, getMemberCountryFlagUrl, getMemberImage, hasNewMember } from '../utils/memberMarkers';
import { createPortraitFallback, createPortraitGroupAvatar, getMapboxPortraitSeparation, getPortraitGroupCount, PORTRAIT_GROUP_CATEGORIES } from '../utils/portraitGroupMarker';
import { clusterMembersByCoordinates } from '../utils/mapCoordinates';

const CATEGORY_COLORS = {
  heroes: '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'kiro-ambassadors': '#8B5CF6',
  'kiro-events': '#7B61FF',
  'aws-ambassadors': '#2D72D2',
  news: '#FF9900',
  events: '#7B61FF',
  'community-days': '#FF9900',
};

const MAX_CLUSTER_AVATARS = 4;
const TOKEN = import.meta.env.VITE_MAP_BOX ?? '';
const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/satellite-streets-v12';
const MAPBOX_3D_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';
const GEOLIBRE_STYLE_URLS = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
};
const GEOLIBRE_SATELLITE_SOURCE_ID = 'aws-geolibre-satellite-source';
const GEOLIBRE_SATELLITE_LAYER_ID = 'aws-geolibre-satellite-layer';
const GEOLIBRE_SATELLITE_TILES = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg';
const HORIZON_CUTOFF_DEGREES = 96;

function getHeatColor(size) {
  if (size >= 12) return '#BF0816';
  if (size >= 7) return '#FF9900';
  if (size >= 4) return '#F2CC0C';
  return '#2D72D2';
}

function formatLiveCountdown(targetValue, prefix = '') {
  const difference = new Date(targetValue).getTime() - Date.now();
  if (!Number.isFinite(difference) || difference <= 0) return `${prefix}Happening today`;

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${prefix}${days} days ${String(hours).padStart(2, '0')} hours ${String(minutes).padStart(2, '0')} minutes ${String(seconds).padStart(2, '0')} seconds`;
}

function toVector(lat, lng) {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const cosLat = Math.cos(latRad);

  return {
    x: cosLat * Math.cos(lngRad),
    y: Math.sin(latRad),
    z: cosLat * Math.sin(lngRad),
  };
}

function createClusterElement(cluster, { category, color, darkMode, separation, onClick }) {
  const communityDay = cluster.members.find((member) => member.category === 'community-days');
  const userGroup = cluster.members.find((member) => member.category === 'user-groups');
  const singleMember = cluster.members.length === 1 ? cluster.members[0] : null;
  const userGroupFlagUrl = userGroup ? getMemberCountryFlagUrl(userGroup) : '';
  const isPastCommunityDay = Boolean(communityDay) && cluster.members.every((member) => member.eventStatus === 'past');
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(
    'aria-label',
    communityDay
      ? `${cluster.members.length} Community Day${cluster.members.length > 1 ? 's' : ''} at this location`
      : singleMember
        ? `${singleMember.name} — ${singleMember.location}`
        : `${cluster.members.length} members at this location`
  );
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.position = 'absolute';
  button.style.left = '0';
  button.style.top = '0';
  button.style.padding = '0';
  button.style.border = '0';
  button.style.background = 'transparent';
  button.style.cursor = 'pointer';
  button.style.pointerEvents = 'auto';
  button.style.transform = 'translate(-50%, -50%)';
  button.style.filter = 'drop-shadow(0 10px 22px rgba(0, 0, 0, 0.42))';
  button.style.willChange = 'transform, opacity';

  if (communityDay) {
    button.style.filter = isPastCommunityDay
      ? 'drop-shadow(0 0 22px rgba(210, 44, 44, 0.9))'
      : 'drop-shadow(0 0 18px rgba(255, 153, 0, 0.72))';
  }

  const frame = document.createElement('div');
  frame.style.display = 'flex';
  frame.style.alignItems = 'center';
  frame.style.justifyContent = 'center';
  frame.style.position = 'relative';
  frame.style.minWidth = cluster.members.length > 1 ? '52px' : '34px';
  frame.style.minHeight = cluster.members.length > 1 ? '40px' : '34px';

  if (communityDay) {
    frame.style.borderRadius = '999px';
    frame.style.boxShadow = isPastCommunityDay
      ? '0 0 0 12px rgba(210, 44, 44, 0.16), 0 0 0 24px rgba(210, 44, 44, 0.06)'
      : '0 0 0 9px rgba(255, 153, 0, 0.12)';
  }

  const images = cluster.members
    .map((member) => ({ src: getMemberImage(member), name: member.name }))
    .filter((member) => member.src)
    .slice(0, PORTRAIT_GROUP_CATEGORIES.has(category) ? 3 : MAX_CLUSTER_AVATARS);

  if (PORTRAIT_GROUP_CATEGORIES.has(category) && getPortraitGroupCount(cluster) > 1) {
    frame.style.width = '78px';
    frame.style.height = '58px';
    frame.appendChild(createPortraitGroupAvatar(cluster, { category, color, darkMode, separation }));
  } else if (communityDay) {
    const flag = document.createElement('img');
    flag.src = getCountryFlagUrl(communityDay.country);
    flag.alt = `${communityDay.country} flag`;
    flag.width = 30;
    flag.height = 30;
    flag.style.width = '30px';
    flag.style.height = '30px';
    flag.style.objectFit = 'cover';
    flag.style.borderRadius = '999px';
    flag.style.border = `3px solid ${color}`;
    flag.style.background = color;
    frame.appendChild(flag);

    if (cluster.members.length > 1) {
      const countBadge = document.createElement('div');
      countBadge.textContent = `+${cluster.members.length - 1}`;
      countBadge.style.position = 'absolute';
      countBadge.style.right = '-8px';
      countBadge.style.bottom = '-6px';
      countBadge.style.minWidth = '20px';
      countBadge.style.height = '20px';
      countBadge.style.padding = '0 5px';
      countBadge.style.borderRadius = '999px';
      countBadge.style.display = 'flex';
      countBadge.style.alignItems = 'center';
      countBadge.style.justifyContent = 'center';
      countBadge.style.background = color;
      countBadge.style.color = '#FFFFFF';
      countBadge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
      countBadge.style.fontSize = '10px';
      countBadge.style.fontWeight = '800';
      frame.appendChild(countBadge);
    }
  } else if (userGroupFlagUrl) {
    const flag = document.createElement('img');
    flag.src = userGroupFlagUrl;
    flag.alt = `${getMemberCountry(userGroup)} flag`;
    flag.width = 30;
    flag.height = 30;
    flag.draggable = false;
    flag.style.width = '30px';
    flag.style.height = '30px';
    flag.style.objectFit = 'cover';
    flag.style.borderRadius = '999px';
    flag.style.border = `3px solid ${color}`;
    flag.style.background = color;
    flag.style.boxShadow = `0 0 0 2px ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    frame.appendChild(flag);

    if (cluster.members.length > 1) {
      const countBadge = document.createElement('div');
      countBadge.textContent = `+${cluster.members.length - 1}`;
      countBadge.style.position = 'absolute';
      countBadge.style.right = '-6px';
      countBadge.style.bottom = '-6px';
      countBadge.style.minWidth = '20px';
      countBadge.style.height = '20px';
      countBadge.style.padding = '0 5px';
      countBadge.style.borderRadius = '999px';
      countBadge.style.display = 'flex';
      countBadge.style.alignItems = 'center';
      countBadge.style.justifyContent = 'center';
      countBadge.style.background = color;
      countBadge.style.color = '#0F1923';
      countBadge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
      countBadge.style.fontSize = '10px';
      countBadge.style.fontWeight = '800';
      countBadge.style.lineHeight = '1';
      frame.appendChild(countBadge);
    }
  } else if (PORTRAIT_GROUP_CATEGORIES.has(category) && images.length === 0) {
    frame.appendChild(createPortraitFallback(category, darkMode));
  } else if (images.length > 0) {
    images.forEach((member, index) => {
      const img = document.createElement('img');
      img.src = member.src;
      img.alt = member.name;
      img.width = images.length > 1 ? 24 : 30;
      img.height = images.length > 1 ? 24 : 30;
      img.draggable = false;
      img.style.width = `${img.width}px`;
      img.style.height = `${img.height}px`;
      img.style.objectFit = 'cover';
      img.style.borderRadius = '999px';
      img.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
      img.style.background = darkMode ? '#152534' : '#F0F7FF';
      img.style.marginLeft = index === 0 ? '0' : '-10px';
      img.style.transform = `translateY(${index % 2 === 0 ? '-2px' : '2px'})`;
      img.style.zIndex = String(images.length - index);
      frame.appendChild(img);
    });
  } else {
    const extraCount = Math.max(0, cluster.members.length - 1);
    const badge = document.createElement('div');
    badge.textContent = getMemberBadgeLabel(cluster.members[0]);
    badge.style.width = '34px';
    badge.style.height = '34px';
    badge.style.borderRadius = '999px';
    badge.style.background = color;
    badge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.color = '#0F1923';
    badge.style.fontSize = '10px';
    badge.style.fontWeight = '800';
    badge.style.lineHeight = '1';
    badge.style.letterSpacing = '0.04em';
    frame.appendChild(badge);

    if (extraCount > 0) {
      const countBadge = document.createElement('div');
      countBadge.textContent = `+${extraCount}`;
      countBadge.style.position = 'absolute';
      countBadge.style.right = '-4px';
      countBadge.style.bottom = '-4px';
      countBadge.style.minWidth = '20px';
      countBadge.style.height = '20px';
      countBadge.style.padding = '0 5px';
      countBadge.style.borderRadius = '999px';
      countBadge.style.display = 'flex';
      countBadge.style.alignItems = 'center';
      countBadge.style.justifyContent = 'center';
      countBadge.style.background = color;
      countBadge.style.color = '#0F1923';
      countBadge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
      countBadge.style.fontSize = '10px';
      countBadge.style.fontWeight = '800';
      countBadge.style.lineHeight = '1';
      frame.appendChild(countBadge);
    }
  }

  if (!PORTRAIT_GROUP_CATEGORIES.has(category) && !communityDay && !userGroupFlagUrl && images.length > 0 && cluster.members.length > MAX_CLUSTER_AVATARS) {
    const badge = document.createElement('div');
    badge.textContent = `+${cluster.members.length - MAX_CLUSTER_AVATARS}`;
    badge.style.position = 'absolute';
    badge.style.right = '-4px';
    badge.style.bottom = '-4px';
    badge.style.minWidth = '20px';
    badge.style.height = '20px';
    badge.style.padding = '0 5px';
    badge.style.borderRadius = '999px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.background = color;
    badge.style.color = '#0F1923';
    badge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    badge.style.fontSize = '10px';
    badge.style.fontWeight = '800';
    badge.style.lineHeight = '1';
    frame.appendChild(badge);
  }

  if (hasNewMember(cluster.members)) {
    frame.appendChild(createNewMemberBadgeElement(darkMode));
  }

  button.appendChild(frame);

  if (communityDay) {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.left = '50%';
    tooltip.style.bottom = 'calc(100% + 18px)';
    tooltip.style.width = 'min(280px, 72vw)';
    tooltip.style.padding = '12px 14px';
    tooltip.style.borderRadius = '12px';
    tooltip.style.background = darkMode ? 'rgba(8, 16, 24, 0.96)' : 'rgba(255, 255, 255, 0.97)';
    tooltip.style.border = `1px solid ${isPastCommunityDay ? 'rgba(225, 74, 74, 0.7)' : 'rgba(255, 153, 0, 0.72)'}`;
    tooltip.style.color = darkMode ? '#FFFFFF' : '#0F1923';
    tooltip.style.textAlign = 'left';
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translate(-50%, 8px)';
    tooltip.style.transition = 'opacity 180ms ease, transform 180ms ease';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.boxShadow = '0 18px 44px rgba(0, 0, 0, 0.34)';
    tooltip.style.zIndex = '10';
    const officialSiteHint = communityDay.profileUrl
      ? `<span style="display:block;margin-top:6px;font-size:10px;color:${darkMode ? '#8B9BAA' : '#6B8196'}">Click to open the official event site ↗</span>`
      : '';
    tooltip.innerHTML = `
      <strong style="display:block;font-size:13px;line-height:1.3">${communityDay.name}</strong>
      <span style="display:block;margin-top:4px;font-size:11px;color:${darkMode ? '#A7BDCF' : '#537190'}">${communityDay.eventDateLabel} · ${communityDay.location}</span>
      <span class="community-day-countdown" style="display:block;margin-top:8px;font-size:11px;font-weight:800;color:${isPastCommunityDay ? '#FF7B7B' : '#FF9900'}">${communityDay.countdownLabel}</span>
      ${officialSiteHint}`;
    button.appendChild(tooltip);
    const countdown = tooltip.querySelector('.community-day-countdown');
    if (countdown && communityDay.countdownAt) {
      countdown.dataset.countdownAt = communityDay.countdownAt;
      countdown.dataset.countdownPrefix = communityDay.countdownPrefix || '';
      countdown.textContent = formatLiveCountdown(communityDay.countdownAt, communityDay.countdownPrefix);
    }
    button.onmouseenter = () => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translate(-50%, 0)';
    };
    button.onmouseleave = () => {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translate(-50%, 8px)';
    };
    button.onfocus = button.onmouseenter;
    button.onblur = button.onmouseleave;
  }
  button.onpointerdown = (event) => event.stopPropagation();
  button.onpointerup = (event) => event.stopPropagation();
  button.onclick = (event) => {
    event.stopPropagation();
    onClick();
  };

  return button;
}

function applyMapbox3dTreatment(map) {
  try {
    map.setFog({
      color: 'rgb(186, 210, 235)',
      'high-color': 'rgb(120, 168, 214)',
      'horizon-blend': 0.08,
      'space-color': 'rgb(7, 16, 25)',
      'star-intensity': 0.18,
    });
  } catch {
    // Fog is only available for compatible projections/styles.
  }

  try {
    if (!map.getLayer('aws-community-3d-buildings') && map.getSource('composite')) {
      map.addLayer({
        id: 'aws-community-3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', ['get', 'extrude'], 'true'],
        type: 'fill-extrusion',
        minzoom: 10,
        paint: {
          'fill-extrusion-color': '#B7C7D8',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 10, 0, 14, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 10, 0, 14, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.58,
        },
      });
    }
  } catch {
    // Some Mapbox styles do not expose building extrusions.
  }

}

function applyGeoLibreTreatment(map, darkMode) {
  try {
    map.setProjection({ type: 'globe' });
  } catch {
    // Older MapLibre releases can already carry the projection in the style.
  }

  try {
    map.setSky({
      'sky-color': darkMode ? '#071019' : '#DCEEFF',
      'horizon-color': darkMode ? '#4F7897' : '#FFFFFF',
      'fog-color': darkMode ? '#183148' : '#DCEEFF',
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.72, 5, 0.72, 7, 0],
    });
    map.setLight({
      anchor: 'map',
      color: '#FFFFFF',
      intensity: darkMode ? 0.9 : 0.72,
      position: [1.5, 90, 80],
    });
  } catch {
    // The basemap remains usable when atmosphere controls are unavailable.
  }

  try {
    if (!map.getSource(GEOLIBRE_SATELLITE_SOURCE_ID)) {
      map.addSource(GEOLIBRE_SATELLITE_SOURCE_ID, {
        type: 'raster',
        tiles: [GEOLIBRE_SATELLITE_TILES],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 14,
        attribution: 'Sentinel-2 cloudless imagery © EOX IT Services GmbH · modified Copernicus Sentinel data 2020',
      });
    }

    if (!map.getLayer(GEOLIBRE_SATELLITE_LAYER_ID)) {
      const firstLabelLayer = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
      const beforeLayerId = map.getLayer('boundary_country_outline')
        ? 'boundary_country_outline'
        : firstLabelLayer;

      map.addLayer({
        id: GEOLIBRE_SATELLITE_LAYER_ID,
        type: 'raster',
        source: GEOLIBRE_SATELLITE_SOURCE_ID,
        paint: {
          'raster-opacity': darkMode ? 0.88 : 0.98,
          'raster-brightness-min': darkMode ? 0.02 : 0.08,
          'raster-brightness-max': darkMode ? 0.78 : 1,
          'raster-contrast': darkMode ? 0.14 : 0.06,
          'raster-saturation': darkMode ? -0.08 : 0.04,
          'raster-fade-duration': 0,
          'raster-resampling': 'linear',
        },
      }, beforeLayerId);
    }
  } catch {
    // Fall back to the vector basemap if the satellite source is unavailable.
  }

  if (!darkMode) return;

  // CARTO Dark Matter uses #0e0e0e for almost every land layer. On a globe
  // that makes the continents disappear into space, so lift the land and
  // country boundaries while preserving the dark theme.
  const landLayerIds = [
    'landcover',
    'park_national_park',
    'park_nature_reserve',
    'landuse',
  ];

  landLayerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, 'fill-color', '#253746');
  });

  if (map.getLayer('background')) map.setPaintProperty('background', 'background-color', '#253746');
  if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', '#071B2A');
  if (map.getLayer('boundary_country_outline')) {
    map.setPaintProperty('boundary_country_outline', 'line-color', 'rgba(170, 203, 226, 0.78)');
    map.setPaintProperty('boundary_country_outline', 'line-width', 1.15);
  }
  if (map.getLayer('boundary_country_inner')) {
    map.setPaintProperty('boundary_country_inner', 'line-color', 'rgba(128, 167, 196, 0.68)');
  }
}

function createCountrySpotlightElement(member, index, darkMode) {
  const wrapper = document.createElement('button');
  wrapper.type = 'button';
  wrapper.setAttribute('aria-label', member.name);
  wrapper.style.position = 'absolute';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.padding = '0';
  wrapper.style.border = '0';
  wrapper.style.background = 'transparent';
  wrapper.style.cursor = 'pointer';
  wrapper.style.pointerEvents = 'auto';
  wrapper.style.transform = 'translate(-50%, -100%)';
  wrapper.style.filter = 'drop-shadow(0 16px 28px rgba(0, 0, 0, 0.42))';
  wrapper.style.willChange = 'transform, opacity';

  const line = document.createElement('div');
  line.style.position = 'absolute';
  line.style.left = '50%';
  line.style.top = '38px';
  line.style.width = '2px';
  line.style.height = `${96 + (index % 3) * 24}px`;
  line.style.transform = 'translateX(-50%)';
  line.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(191, 8, 22, 0.9), rgba(255, 153, 0, 0.4))';
  line.style.borderRadius = '999px';
  line.style.boxShadow = '0 0 18px rgba(255, 153, 0, 0.45)';

  const avatar = document.createElement('div');
  avatar.style.position = 'relative';
  avatar.style.width = '42px';
  avatar.style.height = '42px';
  avatar.style.borderRadius = '999px';
  avatar.style.border = `2px solid ${darkMode ? '#FFFFFF' : '#0F1923'}`;
  avatar.style.background = '#BF0816';
  avatar.style.display = 'flex';
  avatar.style.alignItems = 'center';
  avatar.style.justifyContent = 'center';
  avatar.style.overflow = 'hidden';
  avatar.style.boxShadow = '0 0 0 4px rgba(191, 8, 22, 0.28), 0 0 24px rgba(255, 153, 0, 0.45)';

  const imageUrl = getMemberImage(member);
  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = member.ledBy?.find((leader) => leader?.name)?.name || member.name;
    image.draggable = false;
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.objectFit = 'cover';
    avatar.appendChild(image);
  } else {
    const initials = document.createElement('span');
    initials.textContent = getMemberBadgeLabel(member);
    initials.style.color = '#FFFFFF';
    initials.style.fontSize = '11px';
    initials.style.fontWeight = '900';
    avatar.appendChild(initials);
  }

  const label = document.createElement('div');
  label.textContent = member.name.replace('AWS Student Builder Group at ', '');
  label.style.position = 'absolute';
  label.style.left = '50%';
  label.style.top = '-28px';
  label.style.transform = 'translateX(-50%)';
  label.style.maxWidth = '180px';
  label.style.padding = '4px 8px';
  label.style.borderRadius = '999px';
  label.style.background = darkMode ? 'rgba(8, 16, 24, 0.86)' : 'rgba(255, 255, 255, 0.9)';
  label.style.border = `1px solid ${darkMode ? 'rgba(255,255,255,0.22)' : 'rgba(15,25,35,0.14)'}`;
  label.style.color = darkMode ? '#FFFFFF' : '#0F1923';
  label.style.fontSize = '10px';
  label.style.fontWeight = '800';
  label.style.whiteSpace = 'nowrap';
  label.style.overflow = 'hidden';
  label.style.textOverflow = 'ellipsis';

  wrapper.appendChild(label);
  wrapper.appendChild(line);
  wrapper.appendChild(avatar);
  wrapper.onpointerdown = (event) => event.stopPropagation();
  wrapper.onpointerup = (event) => event.stopPropagation();
  return wrapper;
}

export default function MapboxGlobeScene({
  category,
  members,
  onMarkerClick,
  darkMode,
  flyToTarget,
  zoomCommand,
  heatmapEnabled = false,
  countrySpotlight = null,
  variant = 'mapbox',
}) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const countrySpotlightRef = useRef([]);
  const resizeTimerRef = useRef(null);
  const [communityDaysExpanded, setCommunityDaysExpanded] = useState(false);
  const geoLibreMode = variant === 'geolibre';
  const countrySpotlightActive = !geoLibreMode && category === 'cloud-clubs' && Boolean(countrySpotlight?.nonce);
  const mapEnabled = geoLibreMode || Boolean(TOKEN);

  const clusters = useMemo(
    () => category === 'community-days' && communityDaysExpanded
      ? members.map((member) => ({ lat: member.lat, lng: member.lng, members: [member] }))
      : clusterMembersByCoordinates(members),
    [members, category, communityDaysExpanded]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapEnabled) return;

    const MapEngine = geoLibreMode ? maplibregl : mapboxgl;
    if (!geoLibreMode) mapboxgl.accessToken = TOKEN;

    const map = new MapEngine.Map({
      container: containerRef.current,
      style: geoLibreMode
        ? GEOLIBRE_STYLE_URLS[darkMode ? 'dark' : 'light']
        : countrySpotlightActive ? MAPBOX_3D_STYLE_URL : MAPBOX_STYLE_URL,
      ...(!geoLibreMode ? { projection: countrySpotlightActive ? 'mercator' : 'globe' } : {}),
      center: countrySpotlightActive ? [countrySpotlight.center.lng, countrySpotlight.center.lat] : [0, 18],
      zoom: countrySpotlightActive ? countrySpotlight.zoom : 0.98,
      pitch: countrySpotlightActive ? countrySpotlight.pitch : 0,
      bearing: countrySpotlightActive ? countrySpotlight.bearing : 0,
      attributionControl: false,
    });

    mapRef.current = map;
    if (countrySpotlightActive) {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
    } else {
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
    }
    map.on('style.load', () => {
      if (geoLibreMode) {
        applyGeoLibreTreatment(map, darkMode);
      } else {
        applyMapbox3dTreatment(map);
      }
    });

    const scheduleResize = () => {
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }

      let raf1 = 0;
      let raf2 = 0;

      const runResize = () => {
        map.resize();
        map.triggerRepaint();
      };

      raf1 = window.requestAnimationFrame(() => {
        runResize();
        raf2 = window.requestAnimationFrame(runResize);
      });

      resizeTimerRef.current = window.setTimeout(runResize, 120);

      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
        if (resizeTimerRef.current) {
          window.clearTimeout(resizeTimerRef.current);
          resizeTimerRef.current = null;
        }
      };
    };

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      map.triggerRepaint();
    });
    resizeObserver.observe(containerRef.current);
    const cleanupResize = scheduleResize();

    return () => {
      cleanupResize();
      resizeObserver.disconnect();
      markersRef.current.forEach(({ element }) => element.remove());
      countrySpotlightRef.current.forEach(({ element }) => element.remove());
      markersRef.current = [];
      countrySpotlightRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [
    countrySpotlight?.bearing,
    countrySpotlight?.center?.lat,
    countrySpotlight?.center?.lng,
    countrySpotlight?.country,
    countrySpotlight?.pitch,
    countrySpotlight?.zoom,
    countrySpotlightActive,
    darkMode,
    geoLibreMode,
    mapEnabled,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || category !== 'community-days') return undefined;

    const updateExpansion = () => setCommunityDaysExpanded(map.getZoom() >= 3);
    map.on('zoomend', updateExpansion);
    const frame = window.requestAnimationFrame(updateExpansion);
    return () => {
      window.cancelAnimationFrame(frame);
      map.off('zoomend', updateExpansion);
    };
  }, [category, countrySpotlightActive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let raf1 = 0;
    let raf2 = 0;

    const resizeMap = () => {
      map.resize();
      map.triggerRepaint();
    };

    raf1 = window.requestAnimationFrame(() => {
      resizeMap();
      raf2 = window.requestAnimationFrame(resizeMap);
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [category, members.length, darkMode, heatmapEnabled]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    markersRef.current.forEach(({ element }) => element.remove());
    markersRef.current = [];

    markersRef.current = clusters.map((cluster) => {
      const isPastCommunityDay = category === 'community-days' && cluster.members.every((member) => member.eventStatus === 'past');
      const color = isPastCommunityDay
        ? '#D22C2C'
        : heatmapEnabled ? getHeatColor(cluster.members.length) : CATEGORY_COLORS[category] ?? '#FF9900';
      const element = createClusterElement(cluster, {
        category,
        color,
        darkMode,
        separation: getMapboxPortraitSeparation(mapRef.current?.getZoom() ?? 1),
        onClick: () => {
          const map = mapRef.current;
          if (!map) return;

          if (getPortraitGroupCount(cluster) > 1 && map.getZoom() < 2.8) {
            map.easeTo({
              center: [cluster.lng, cluster.lat],
              zoom: Math.min(map.getZoom() + 1.1, 4.2),
              duration: 700,
            });
            return;
          }

          map.flyTo({
            center: [cluster.lng, cluster.lat],
            zoom: Math.max(map.getZoom(), 3.2),
            duration: 900,
            essential: true,
          });

          const payload = cluster.members.length === 1 ? cluster.members[0] : cluster.members;
          onMarkerClick(payload);
        },
      });

      overlay.appendChild(element);

      return { cluster, element };
    });

    return () => {
      markersRef.current.forEach(({ element }) => element.remove());
      markersRef.current = [];
    };
  }, [clusters, category, darkMode, heatmapEnabled, onMarkerClick]);

  useEffect(() => {
    if (category !== 'community-days') return undefined;

    const updateCountdowns = () => {
      markersRef.current.forEach(({ element }) => {
        const countdown = element.querySelector('.community-day-countdown[data-countdown-at]');
        if (!countdown) return;
        countdown.textContent = formatLiveCountdown(countdown.dataset.countdownAt, countdown.dataset.countdownPrefix);
      });
    };

    updateCountdowns();
    const interval = window.setInterval(updateCountdowns, 1000);
    return () => window.clearInterval(interval);
  }, [category]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const map = mapRef.current;
    if (!overlay || !map) return;

    countrySpotlightRef.current.forEach(({ element }) => element.remove());
    countrySpotlightRef.current = [];

    const members = countrySpotlight?.members ?? [];
    if (!countrySpotlight?.nonce || category !== 'cloud-clubs' || members.length === 0) return;

    const createSpotlightElements = () => {
      countrySpotlightRef.current.forEach(({ element }) => element.remove());
      countrySpotlightRef.current = members.map((member, index) => {
        const element = createCountrySpotlightElement(member, index, darkMode);
        element.onclick = (event) => {
          event.stopPropagation();
          onMarkerClick(member);
        };
        overlay.appendChild(element);
        return { member, element, index };
      });
    };

    const flyIntoCountry = () => {
      applyMapbox3dTreatment(map);
      createSpotlightElements();
      map.flyTo({
        center: [countrySpotlight.center.lng, countrySpotlight.center.lat],
        zoom: countrySpotlight.zoom,
        pitch: countrySpotlight.pitch,
        bearing: countrySpotlight.bearing,
        duration: 1700,
        essential: true,
      });
    };

    flyIntoCountry();

    return () => {
      countrySpotlightRef.current.forEach(({ element }) => element.remove());
      countrySpotlightRef.current = [];
    };
  }, [
    category,
    countrySpotlight?.bearing,
    countrySpotlight?.center?.lat,
    countrySpotlight?.center?.lng,
    countrySpotlight?.members,
    countrySpotlight?.nonce,
    countrySpotlight?.pitch,
    countrySpotlight?.zoom,
    darkMode,
    onMarkerClick,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const updateOverlay = () => {
      const center = map.getCenter();
      const centerVec = toVector(center.lat, center.lng);
      const cutoff = Math.cos((HORIZON_CUTOFF_DEGREES * Math.PI) / 180);
      const width = map.getCanvas().clientWidth;
      const height = map.getCanvas().clientHeight;
      const spotlightActive = category === 'cloud-clubs' && Boolean(countrySpotlight?.nonce);

      markersRef.current.forEach(({ cluster, element }) => {
        const project = map.project([cluster.lng, cluster.lat]);
        const vec = toVector(cluster.lat, cluster.lng);
        const visible = (vec.x * centerVec.x) + (vec.y * centerVec.y) + (vec.z * centerVec.z) >= cutoff;
        const onScreen = project.x >= -80 && project.x <= width + 80 && project.y >= -80 && project.y <= height + 80;
        const hideForCountrySpotlight = spotlightActive
          && cluster.members.some((member) => getMemberCountry(member) === countrySpotlight.country);
        const portraitMarker = element.querySelector('[data-portrait-cluster-marker]');
        portraitMarker?.style.setProperty('--portrait-separation', getMapboxPortraitSeparation(map.getZoom()).toFixed(3));

        element.style.transform = `translate(-50%, -50%) translate(${project.x}px, ${project.y}px)`;
        element.style.opacity = visible && onScreen && !hideForCountrySpotlight ? '1' : '0';
        element.style.visibility = visible && onScreen && !hideForCountrySpotlight ? 'visible' : 'hidden';
        element.style.pointerEvents = visible && onScreen && !hideForCountrySpotlight ? 'auto' : 'none';
        element.style.zIndex = String(Math.round(project.y * 1000));
      });

      countrySpotlightRef.current.forEach(({ member, element, index }) => {
        const project = map.project([member.lng, member.lat]);
        const heightOffset = 120 + (index % 3) * 24;
        const visible = project.x >= -120 && project.x <= width + 120 && project.y >= -180 && project.y <= height + 120;

        element.style.transform = `translate(-50%, -100%) translate(${project.x}px, ${project.y - heightOffset}px)`;
        element.style.opacity = visible ? '1' : '0';
        element.style.visibility = visible ? 'visible' : 'hidden';
        element.style.pointerEvents = visible ? 'auto' : 'none';
        element.style.zIndex = String(100000 + Math.round(project.y * 1000));
      });
    };

    map.on('render', updateOverlay);
    map.on('move', updateOverlay);
    map.on('zoom', updateOverlay);
    map.on('resize', updateOverlay);
    updateOverlay();

    return () => {
      map.off('render', updateOverlay);
      map.off('move', updateOverlay);
      map.off('zoom', updateOverlay);
      map.off('resize', updateOverlay);
    };
  }, [category, countrySpotlight?.country, countrySpotlight?.nonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    if (category === 'cloud-clubs' && countrySpotlight?.nonce) return;

    map.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: Math.max(map.getZoom(), 2.8),
      duration: 1000,
      essential: true,
    });
  }, [category, countrySpotlight?.nonce, flyToTarget]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomCommand?.direction) return;

    if (zoomCommand.direction === 'in') {
      map.zoomIn({ duration: 250 });
    } else if (zoomCommand.direction === 'out') {
      map.zoomOut({ duration: 250 });
    }
  }, [zoomCommand]);

  return (
    <div className={`relative h-full w-full overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}>
      <div className="aws-globe-pattern" />

      {!mapEnabled ? (
        <div className="relative z-10 flex h-full items-center justify-center p-6">
          <div
            className="max-w-md rounded-[24px] px-5 py-4 text-center"
            style={{
              background: darkMode ? 'rgba(7, 16, 25, 0.82)' : 'rgba(255, 255, 255, 0.88)',
              border: `1px solid ${darkMode ? 'rgba(76, 109, 138, 0.4)' : 'rgba(160, 187, 212, 0.72)'}`,
              color: darkMode ? '#DCE7F0' : '#17324B',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            Add <code>VITE_MAP_BOX</code> to your local env file to enable the Mapbox world view.
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className="absolute inset-0 z-10 h-full w-full"
            style={{ touchAction: 'none', overscrollBehavior: 'none' }}
          />
          <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20" />
        </>
      )}

    </div>
  );
}
