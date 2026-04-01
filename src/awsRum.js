import { AwsRum } from 'aws-rum-web';

try {
  const config = {
    sessionSampleRate: 1,
    endpoint: 'https://dataplane.rum.ap-southeast-1.amazonaws.com',
    telemetries: ['performance', 'errors', 'http'],
    allowCookies: true,
    enableXRay: false,
    signing: true,
  };

  const APPLICATION_ID = 'e5448bbe-e070-4112-b359-7e626e155106';
  const APPLICATION_VERSION = '1.0.0';
  const APPLICATION_REGION = 'ap-southeast-1';

  new AwsRum(
    APPLICATION_ID,
    APPLICATION_VERSION,
    APPLICATION_REGION,
    config
  );
} catch {
  // Ignore RUM startup failures so the app still loads.
}
