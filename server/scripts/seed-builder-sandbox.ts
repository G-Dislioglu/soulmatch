import dotenv from 'dotenv';
import { seedBuilderSandbox } from '../src/lib/sandboxSeed.js';

dotenv.config();

async function main() {
  const result = await seedBuilderSandbox();
  console.log(`[sandbox-seed] inserted ${result.taskCount} synthetic builder tasks`);
}

main().catch((error) => {
  console.error('[sandbox-seed] failed:', error);
  process.exitCode = 1;
});
