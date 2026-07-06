module.exports = {
  apps: [
    {
      name: 'mocavis-be',
      cwd: './web-backend',
      script: 'bun',
      args: 'start',
      max_memory_restart: '400M',
      cron_restart: '0 3 * * *', // Restart every 3 AM
      autorestart: true,
      watch: false,
      exp_backoff_restart_delay: 100,
      shutdown_with_message: true,
    },
    {
      name: 'mocavis-fe',
      cwd: './web-frontend',
      script: 'bun',
      args: 'run preview:prod',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      exp_backoff_restart_delay: 100,
      shutdown_with_message: true,
    },
  ],
};