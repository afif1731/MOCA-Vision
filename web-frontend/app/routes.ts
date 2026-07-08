import { index, layout, prefix, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('sandbox', 'routes/sandbox/index.tsx'),
  route('login', 'routes/login/index.tsx'),

  layout('routes/layouts/public-layout.tsx', [
    index('routes/home/index.tsx'),
    route('home', 'routes/home/home-redirect.tsx'),
    route('layout', 'routes/panel-layout/index.tsx'),
  ]),

  layout('routes/layouts/private-layout.tsx', [
    ...prefix('device-settings', [
      index('routes/device-settings/entry/index.tsx'),
      route('create', 'routes/device-settings/create/index.tsx'),
      route(':device_id', 'routes/device-settings/detail/index.tsx'),
    ]),
    ...prefix('cctv-settings', [
      index('routes/cctv-settings/entry/index.tsx'),
      route('create', 'routes/cctv-settings/create/index.tsx'),
      route(':camera_id', 'routes/cctv-settings/detail/index.tsx'),
    ]),
    ...prefix('report-wa', [
      index('routes/report-wa/entry/index.tsx'),
      route('create', 'routes/report-wa/create/index.tsx'),
      route(':id', 'routes/report-wa/detail/index.tsx'),
    ]),
    ...prefix('report-email', [
      index('routes/report-email/entry/index.tsx'),
      route('create', 'routes/report-email/create/index.tsx'),
      route(':id', 'routes/report-email/detail/index.tsx'),
    ]),
    ...prefix('footage-log', [
      index('routes/footage-log/entry/index.tsx'),
      route(':anomaly_id', 'routes/footage-log/detail/index.tsx'),
    ]),
  ]),

  layout('routes/layouts/authenticated-layout.tsx', [route('profile', 'routes/profile/index.tsx')]),

  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
