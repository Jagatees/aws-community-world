export const HOME_CATEGORY_STYLES = {
  heroes: {
    color: '#FF9900',
    rgb: '255, 153, 0',
    markerColor: [1, 0.58, 0.04],
    badge: 'H',
  },
  'community-builders': {
    color: '#21C969',
    rgb: '33, 201, 105',
    markerColor: [0.13, 0.79, 0.41],
    badge: 'CB',
  },
  'user-groups': {
    color: '#20BCE0',
    rgb: '32, 188, 224',
    markerColor: [0.13, 0.74, 0.88],
    badge: 'UG',
  },
  'cloud-clubs': {
    color: '#F13B5A',
    rgb: '241, 59, 90',
    markerColor: [0.95, 0.23, 0.35],
    badge: 'SBG',
  },
  'kiro-ambassadors': {
    color: '#9B72FF',
    rgb: '155, 114, 255',
    markerColor: [0.61, 0.45, 1],
    badge: 'KI',
  },
};

function communityMarker(marker) {
  return {
    ...HOME_CATEGORY_STYLES[marker.category],
    ...marker,
  };
}

// A small, deliberately balanced sample for the home globe. Keeping this separate
// from the full category datasets avoids loading several megabytes before entry.
export const HOME_COMMUNITY_MARKERS = [
  communityMarker({
    name: 'Eric Hammond',
    role: 'AWS Hero',
    category: 'heroes',
    lat: 36.7014631,
    lng: -118.755997,
    image: 'https://avatars.builderprofile.aws.dev/33vCwXSpdxwSBdTJ8TUDXJ6fAhd.webp',
  }),
  communityMarker({
    name: 'Aashish Aacharya',
    role: 'Community Builder',
    category: 'community-builders',
    lat: 39.5162401,
    lng: -76.9382069,
    image: 'https://avatars.builderprofile.aws.dev/3COnjMEcOHhlgBib7ycZD10dBSm.webp',
  }),
  communityMarker({
    name: 'AWS UG Seattle',
    role: 'User Group',
    category: 'user-groups',
    lat: 47.6038321,
    lng: -122.330062,
  }),
  communityMarker({
    name: 'Algoma University',
    role: 'Student Builder Group',
    category: 'cloud-clubs',
    lat: 43.685832,
    lng: -79.7599366,
  }),
  communityMarker({
    name: 'Eric (GoZippy)',
    role: 'Kiro Ambassador',
    category: 'kiro-ambassadors',
    lat: 37.6872,
    lng: -97.3301,
    image: '/ambassadors/eric-gozippy.jpg',
  }),
  communityMarker({
    name: 'Johannes Koch',
    role: 'AWS Hero',
    category: 'heroes',
    lat: 50.6080651,
    lng: 9.0284647,
    image: 'https://avatars.builderprofile.aws.dev/36KBlzxUDq2hYEnJ9XOXyZ95ksu.webp',
  }),
  communityMarker({
    name: 'Aaron Walker',
    role: 'Community Builder',
    category: 'community-builders',
    lat: 51.1638175,
    lng: 10.4478313,
    image: 'https://avatars.builderprofile.aws.dev/2uRAVUtzXEYHIFfFMmDlqzhHdCM.webp',
  }),
  communityMarker({
    name: 'AWS UG Paris',
    role: 'User Group',
    category: 'user-groups',
    lat: 48.8588897,
    lng: 2.320041,
  }),
  communityMarker({
    name: '1337 Coding School',
    role: 'Student Builder Group',
    category: 'cloud-clubs',
    lat: 32.8856482,
    lng: -6.908798,
  }),
  communityMarker({
    name: 'Steve Teo',
    role: 'AWS Hero',
    category: 'heroes',
    lat: 1.357107,
    lng: 103.8194992,
    image: 'https://avatars.builderprofile.aws.dev/2omF42CTAVY7WPOgXj1Hsq0XEcJ.webp',
  }),
  communityMarker({
    name: 'A.T.M Ruhul Amin',
    role: 'Community Builder',
    category: 'community-builders',
    lat: 24.4769288,
    lng: 90.2934413,
    image: 'https://avatars.builderprofile.aws.dev/2wIc2yhPMJDBLCdkfOQGoTzAqIu.webp',
  }),
  communityMarker({
    name: 'AWS UG Singapore',
    role: 'User Group',
    category: 'user-groups',
    lat: 1.357107,
    lng: 103.8194992,
  }),
  communityMarker({
    name: 'Adamson University',
    role: 'Student Builder Group',
    category: 'cloud-clubs',
    lat: 14.5904492,
    lng: 120.9803621,
  }),
  communityMarker({
    name: 'James Gabriele Torzar',
    role: 'Kiro Ambassador',
    category: 'kiro-ambassadors',
    lat: 12.8797,
    lng: 121.774,
  }),
];
