import { useMemo } from 'react';
import { SRI_LANKA_3D_CONFIG } from '../config/countrySpotlights';
import MapboxGlobeScene from './MapboxGlobeScene';

function isSriLankanMember(member) {
  if (member?.country) return member.country === SRI_LANKA_3D_CONFIG.country;

  const locationParts = member?.location?.split(',') ?? [];
  return locationParts.at(-1)?.trim() === SRI_LANKA_3D_CONFIG.country;
}

/**
 * Dedicated Sri Lanka 3D experience.
 *
 * This component owns the Sri Lanka dataset selection and camera treatment so
 * the `sl=1` route can evolve without adding country-specific behavior to App.
 */
export default function SriLanka3DScene({ members, spotlightNonce, ...sceneProps }) {
  const sriLankaMembers = useMemo(
    () => members.filter(isSriLankanMember),
    [members]
  );

  const countrySpotlight = useMemo(
    () => ({
      ...SRI_LANKA_3D_CONFIG,
      members: sriLankaMembers,
      nonce: spotlightNonce,
    }),
    [spotlightNonce, sriLankaMembers]
  );

  return (
    <MapboxGlobeScene
      {...sceneProps}
      category="cloud-clubs"
      members={sriLankaMembers}
      countrySpotlight={countrySpotlight}
    />
  );
}
