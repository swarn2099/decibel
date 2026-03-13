module.exports = {
  apps: [{
    name: 'decibel-scraper',
    script: 'dist/server.js',
    max_memory_restart: '512M',
    restart_delay: 3000,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production',
      PORT: 4001,
    },
  }],
};
