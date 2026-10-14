/**
 * Angora Work OS — ICM (useicm.com) Context Sync Utility
 *
 * Usage:
 *   node tools/icm/sync-icm-context.mjs --create
 *   node tools/icm/sync-icm-context.mjs --get <hash>
 *   node tools/icm/sync-icm-context.mjs --push <hash> <api_key>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const contextFile = path.join(rootDir, 'docs/ai-knowledge/icm/angora-context-export.md');
const BASE_URL = process.env.BASE_URL || 'https://useicm.com';

const args = process.argv.slice(2);
const command = args[0];

async function run() {
  if (command === '--create') {
    const content = fs.existsSync(contextFile)
      ? fs.readFileSync(contextFile, 'utf8')
      : '# Angora Work OS\nAI development context.';

    console.log(`[ICM] Creating new context box on ${BASE_URL}...`);
    const res = await fetch(`${BASE_URL}/api/objects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        initial_llm_txt: content,
        rules: null,
      }),
    });

    if (!res.ok) {
      console.error(`[ICM] Error: HTTP ${res.status}`);
      process.exit(1);
    }

    const data = await res.json();
    console.log('[ICM] Context box successfully created:');
    console.log(`- Hash: ${data.hash}`);
    console.log(`- Public URL: ${BASE_URL}/icm/${data.hash}`);
    console.log(`- llm.txt: ${BASE_URL}/api/objects/${data.hash}/llm.txt`);
    console.log(`- One-Time API Key: ${data.api_key}`);
    console.log('\nSave this API key safely; it is only displayed once.');
  } else if (command === '--get') {
    const hash = args[1];
    if (!hash) {
      console.error('Usage: node sync-icm-context.mjs --get <hash>');
      process.exit(1);
    }

    console.log(`[ICM] Fetching public context for ${hash}...`);
    const res = await fetch(`${BASE_URL}/api/objects/${hash}/llm.txt`);
    if (!res.ok) {
      console.error(`[ICM] Error: HTTP ${res.status}`);
      process.exit(1);
    }

    const text = await res.text();
    console.log('\n--- Retrieved llm.txt ---');
    console.log(text);
  } else if (command === '--push') {
    const hash = args[1];
    const apiKey = args[2];
    if (!hash || !apiKey) {
      console.error('Usage: node sync-icm-context.mjs --push <hash> <api_key>');
      process.exit(1);
    }

    const content = fs.readFileSync(contextFile, 'utf8');
    console.log(`[ICM] Updating context for ${hash}...`);
    const res = await fetch(`${BASE_URL}/api/objects/${hash}/llm.txt`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ body: content }),
    });

    if (!res.ok) {
      console.error(`[ICM] Error updating context: HTTP ${res.status}`);
      process.exit(1);
    }

    console.log('[ICM] Context successfully updated on useicm.com!');
  } else {
    console.log('Angora ICM CLI Helper');
    console.log('Commands:');
    console.log('  --create                 Create a new context object on useicm.com');
    console.log('  --get <hash>             Fetch public llm.txt context');
    console.log('  --push <hash> <apiKey>   Push local angora-context-export.md to ICM');
  }
}

run().catch((err) => {
  console.error('[ICM] Fatal Error:', err.message);
  process.exit(1);
});
