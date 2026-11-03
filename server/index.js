import { createApp } from './app.js';
import { readConfig } from './config.js';

try {
  const config = readConfig();
  const { app, close } = createApp(config);
  const server = app.listen(8080, process.env.POKEVAULT_LISTEN || '127.0.0.1', () => console.info(`PokéVault access: ${config.origin}`));
  server.headersTimeout = 10_000; server.requestTimeout = 15_000; server.timeout = 15_000;
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
    close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref();
  });
} catch (error) {
  console.error(`PokéVault: ${error.message}`); process.exitCode = 1;
}
