module.exports = {
  apps: [{
    name: 'jisa-app',
    script: '/opt/bitnami/python/bin/python3',
    args: '-m uvicorn app:app --host 0.0.0.0 --port 9000 --root-path /chat --reload',
    cwd: '/home/bitnami/archive/context-hub/jisa_app',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      PYTHONUNBUFFERED: '1'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    kill_timeout: 5000
  }]
};
