import Elysia from 'elysia';

import { removeFootageLog, removeRefreshTokenJob } from './cronjobs';

export const systemCronjobs = new Elysia({ name: 'system-cronjobs' })
  .use(removeRefreshTokenJob)
  .use(removeFootageLog);
