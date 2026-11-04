#!/usr/bin/env node

/**
 * Google Drive CBZ Ingest & Camouflage Tool (Trial / Sample CLI)
 *
 * Usage:
 *   node scripts/gdrive-cbz-ingest.mjs mask <input-file.cbz> <output-file.dat>
 *   node scripts/gdrive-cbz-ingest.mjs unmask <input-file.dat> <output-file.cbz>
 *   node scripts/gdrive-cbz-ingest.mjs verify <file>
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_XOR_KEY = new Uint8Array([
  0x5a, 0xa5, 0x3c, 0xc3, 0x1f, 0xf1, 0x7e, 0xe7,
]);

function xor32(buffer) {
  const result = Buffer.from(buffer);
  const limit = Math.min(result.length, 32);
  for (let i = 0; i < limit; i++) {
    result[i] ^= DEFAULT_XOR_KEY[i % DEFAULT_XOR_KEY.length];
  }
  return result;
}

function detectSignature(buffer) {
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return 'ZIP / CBZ Archive (PK\\x03\\x04) [DETECTED BY GOOGLE AI SCANNER]';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'WebP Image (RIFF....WEBP) [DETECTED BY GOOGLE AI SCANNER]';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'JPEG Image (\\xFF\\xD8\\xFF) [DETECTED BY GOOGLE AI SCANNER]';
  }
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'PNG Image (\\x89PNG) [DETECTED BY GOOGLE AI SCANNER]';
  }
  return 'Unknown / Obfuscated Binary Data (Safe from Google automated hash scanning)';
}

const [,, command, inputPath, outputPath] = process.argv;

if (!command) {
  console.log(`
Light-Story 5TB Google Drive Ingestion Tool
Commands:
  mask   <input.cbz> <output.dat>   Mask the first 32 bytes for safe Google Drive upload
  unmask <input.dat> <output.cbz>   Restore the original CBZ file
  verify <file>                     Check file header and detection status
  `);
  process.exit(0);
}

if (command === 'verify') {
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('Error: File not found:', inputPath);
    process.exit(1);
  }
  const buf = fs.readFileSync(inputPath);
  console.log(`File: ${inputPath} (${buf.length} bytes)`);
  console.log(`First 16 bytes: ${buf.slice(0, 16).toString('hex')}`);
  console.log(`Status: ${detectSignature(buf)}`);
  process.exit(0);
}

if (command === 'mask' || command === 'unmask') {
  if (!inputPath || !outputPath) {
    console.error(`Usage: node scripts/gdrive-cbz-ingest.mjs ${command} <input> <output>`);
    process.exit(1);
  }
  if (!fs.existsSync(inputPath)) {
    console.error('Error: Input file not found:', inputPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath);
  const processed = xor32(raw);
  fs.writeFileSync(outputPath, processed);

  console.log(`✓ Successfully ${command === 'mask' ? 'masked' : 'unmasked'}:`);
  console.log(`  Source: ${inputPath} -> ${detectSignature(raw)}`);
  console.log(`  Target: ${outputPath} -> ${detectSignature(processed)}`);
  process.exit(0);
}
