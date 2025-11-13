module.exports = {
  apps: [{
    name: 'commission-system',
    script: 'src/nl_query_system_dynamic.js',
    cwd: '/home/bitnami/archive/context-hub/jisa_app/commission_query_system_dynamic',
    instances: 1,
    exec_mode: 'fork',

    // Environment variables
    env: {
      NODE_ENV: 'production',
    },

    // Restart settings
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',

    // Restart strategies
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,

    // Error handling
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,

    // Log rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Process management
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,

    // Advanced options
    treekill: true,
    pmx: true,
  }],
};
