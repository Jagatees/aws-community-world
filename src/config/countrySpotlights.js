const SINGAPORE_MEMBER_COORDINATES = {
  '499a434a-eb44-3664-3b51-98a095860d23': { lat: 1.3799, lng: 103.8493 },
  '34ee8d7b-8da2-f33a-510e-99e652db0321': { lat: 1.3297, lng: 103.7754 },
  'a042ae92-3790-534f-159b-adb3437aa085': { lat: 1.4126, lng: 103.9101 },
  '56b2e27e-abb5-6aeb-0faa-0e3b51cfaa1f': { lat: 1.2966, lng: 103.8501 },
  'eb0ddaa8-819f-9a18-7904-202bf7a340c0': { lat: 1.2966, lng: 103.7764 },
};

const SRI_LANKA_MEMBER_COORDINATES = {
  '5928bb9a-028e-64aa-b504-1f90bbc4a618': { lat: 6.9754032, lng: 79.9106825 },
  '51790e13-ffca-c88f-3bf9-2e5f8c107300': { lat: 6.9062952, lng: 79.8659558 },
  '11053f59-689f-661a-602a-c70918854ef3': { lat: 9.6838937, lng: 80.0181858 },
  '32622eda-d6b4-f4e5-1838-83774401668c': { lat: 6.8953126, lng: 79.8531094 },
  'c112c5b5-d166-5538-b4d7-4c795b03d62d': { lat: 6.852767, lng: 79.8987137 },
  'f362adcb-67a5-ed6d-fd46-5e7f5a65d7b6': { lat: 8.7566411, lng: 80.4073651 },
  '92c2e68d-e4f2-51c1-68da-759fe2b90657': { lat: 7.2969678, lng: 81.8451619 },
  '59658a67-ef8e-30ea-eaf4-b002a7c472ff': { lat: 6.8213291, lng: 80.036702 },
  '594034b3-37a0-cab9-aae2-2b5e5bfceb07': { lat: 6.7145912, lng: 80.7823476 },
  '6f834652-2287-d7a3-c7c8-5ce063e231cc': { lat: 6.8080276, lng: 79.9881555 },
};

export const COUNTRY_SPOTLIGHTS = {
  Singapore: {
    country: 'Singapore',
    queryKey: 'sg',
    center: { lat: 1.3521, lng: 103.8198 },
    zoom: 11.85,
    pitch: 68,
    bearing: -24,
    memberCoordinates: SINGAPORE_MEMBER_COORDINATES,
  },
  'Sri Lanka': {
    country: 'Sri Lanka',
    queryKey: 'sl',
    center: { lat: 7.8731, lng: 80.7718 },
    zoom: 7.25,
    pitch: 56,
    bearing: -16,
    memberCoordinates: SRI_LANKA_MEMBER_COORDINATES,
    contributor: {
      name: 'PamudaUposath',
      url: 'https://github.com/Jagatees/aws-community-world/pull/2',
    },
  },
};

export const COUNTRY_3D_CONTRIBUTION_URL =
  'https://github.com/Jagatees/aws-community-world/blob/main/CONTRIBUTING.md#add-a-country-3d-spotlight';

export function getCountrySpotlightFromParams(params) {
  return Object.values(COUNTRY_SPOTLIGHTS).find(
    (spotlight) => params.get(spotlight.queryKey) === '1'
  ) ?? null;
}
