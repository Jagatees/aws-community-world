import { AwsRum } from 'aws-rum-web';

const APPLICATION_ID = import.meta.env.VITE_AWS_RUM_APP_ID ?? 'e5448bbe-e070-4112-b359-7e626e155106';
const APPLICATION_VERSION = import.meta.env.VITE_AWS_RUM_APP_VERSION ?? '1.0.0';
const APPLICATION_REGION = import.meta.env.VITE_AWS_RUM_APP_REGION ?? 'ap-southeast-1';
const ENDPOINT = import.meta.env.VITE_AWS_RUM_ENDPOINT ?? 'https://dataplane.rum.ap-southeast-1.amazonaws.com';
const IDENTITY_POOL_ID = import.meta.env.VITE_AWS_RUM_IDENTITY_POOL_ID;
const GUEST_ROLE_ARN = import.meta.env.VITE_AWS_RUM_GUEST_ROLE_ARN;
const RUM_ENABLED = import.meta.env.VITE_AWS_RUM_ENABLED !== 'false';
const SIGNING_ENABLED = import.meta.env.VITE_AWS_RUM_SIGNING !== 'false';

function initRum() {
  if (!RUM_ENABLED) {
    console.info('[AWS RUM] Disabled via VITE_AWS_RUM_ENABLED=false');
    return;
  }

  const config = {
    sessionSampleRate: 1,
    endpoint: ENDPOINT,
    telemetries: ['performance', 'errors', 'http'],
    allowCookies: true,
    enableXRay: false,
    signing: SIGNING_ENABLED,
  };

  if (SIGNING_ENABLED) {
    if (IDENTITY_POOL_ID) config.identityPoolId = IDENTITY_POOL_ID;
    if (GUEST_ROLE_ARN) config.guestRoleArn = GUEST_ROLE_ARN;

    if (!IDENTITY_POOL_ID || !GUEST_ROLE_ARN) {
      console.warn(
        '[AWS RUM] Missing identity config. Set VITE_AWS_RUM_IDENTITY_POOL_ID and VITE_AWS_RUM_GUEST_ROLE_ARN.'
      );
    }
  }

  try {
    new AwsRum(APPLICATION_ID, APPLICATION_VERSION, APPLICATION_REGION, config);
    console.info('[AWS RUM] Initialized', {
      appId: APPLICATION_ID,
      region: APPLICATION_REGION,
      endpoint: ENDPOINT,
      signing: SIGNING_ENABLED,
      hasIdentityPoolId: Boolean(IDENTITY_POOL_ID),
      hasGuestRoleArn: Boolean(GUEST_ROLE_ARN),
    });
  } catch (error) {
    console.error('[AWS RUM] Failed to initialize', error);
  }
}

initRum();
