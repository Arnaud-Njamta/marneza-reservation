module.exports = {
  apps: [
    {
      name: 'marneza-api',
      cwd: './apps/api',
      script: 'npm',
      args: 'run start',
      instances: 1,
      env: { NODE_ENV: 'production' },
    },
  ],
};
