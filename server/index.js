import { createApp } from './app.js';
import { readConfig, readVaultConfig } from './config.js';
import { openVaultStore } from './vault-store.js';

try {
  const config = readConfig(), vaultConfig = readVaultConfig();
  // Fails closed: a missing key, damaged file or missing original stops startup
  // instead of serving or overwriting an incomplete bank.
  const vault = await openVaultStore(vaultConfig.dir, vaultConfig.key);
  const { app, close } = createApp(config, { vault, vaultQuotaBytes: vaultConfig.quotaBytes });
  const server = app.listen(8080, process.env.POKEVAULT_LISTEN || '127.0.0.1', () => console.info(`PokéVault access: ${config.origin}`));
  // Uploads of 512 KiB saves and large states need more than the login timeouts.
  server.headersTimeout = 10_000; server.requestTimeout = 60_000; server.timeout = 60_000;
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
    close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref();
  });
} catch (error) {
  console.error(`PokéVault: ${error.message}`); process.exitCode = 1;
}
