export const SINGAPORE_3D_CONFIG = {
  country: 'Singapore',
  queryKey: 'sg',
  center: { lat: 1.3521, lng: 103.8198 },
  zoom: 11.85,
  pitch: 68,
  bearing: -24,
};

export const SRI_LANKA_3D_CONFIG = {
  country: 'Sri Lanka',
  queryKey: 'sl',
  center: { lat: 7.8731, lng: 80.7718 },
  zoom: 7.25,
  pitch: 56,
  bearing: -16,
};

export const COUNTRY_SPOTLIGHTS = {
  [SINGAPORE_3D_CONFIG.country]: SINGAPORE_3D_CONFIG,
  [SRI_LANKA_3D_CONFIG.country]: SRI_LANKA_3D_CONFIG,
};
