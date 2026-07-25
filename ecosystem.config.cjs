module.exports = {
  apps: [
    {
      name: "invotrack-backend",
      cwd: "./backend",
      script: "dist/src/main.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
    {
      name: "invotrack-frontend",
      cwd: "./frontend",
      script: "dist/server/entry.mjs",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 4321,
        API_PROXY_TARGET: "http://127.0.0.1:3001",
      },
    },
  ],
};
