
import { evolutionService } from './src/lib/evolution.js';
import { logger } from './src/lib/logger.js';

// Mocking some env vars if needed
process.env.EVOLUTION_API_URL = "http://152.67.55.69:8080";
process.env.EVOLUTION_API_KEY = "mostrara_global_key_2026_super_secret";

async function test() {
  const instanceName = "test_instance_debug";
  console.log(`Starting test for ${instanceName}...`);
  
  try {
    const result = await evolutionService.ensureInstanceAndGetQr(instanceName);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
