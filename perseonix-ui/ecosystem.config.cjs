// PM2 process definition for the Perseonix Corvael production server.
// Start/reload via: pm2 startOrReload ecosystem.config.cjs --update-env
module.exports = {
  apps: [
    {
      name: "perseonix",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "2G",
      env: {
        NODE_ENV: "production",
        // PGLITE_DATA_DIR should be set in .env.local to a path OUTSIDE this repo
        // (e.g. /opt/perseonix-data/pglite) so deploys never wipe the database.
      },
    },
  ],
}
