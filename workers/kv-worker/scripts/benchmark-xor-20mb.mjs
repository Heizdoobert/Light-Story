import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';

const DEFAULT_XOR_KEY = new Uint8Array([
  0x5a, 0xa5, 0x3c, 0xc3, 0x1f, 0xf1, 0x7e, 0xe7,
]);
const DEFAULT_MASK_BYTES = 32;

function xorBufferHeader(buffer, key = DEFAULT_XOR_KEY, maskBytes = DEFAULT_MASK_BYTES) {
  const result = new Uint8Array(buffer);
  const limit = Math.min(result.length, maskBytes);
  for (let i = 0; i < limit; i++) {
    result[i] ^= key[i % key.length];
  }
  return result;
}

function createUnmaskTransformStream(key = DEFAULT_XOR_KEY, maskBytes = DEFAULT_MASK_BYTES) {
  let bytesUnmasked = 0;
  return new TransformStream({
    transform(chunk, controller) {
      if (bytesUnmasked >= maskBytes) {
        controller.enqueue(chunk);
        return;
      }
      const needed = maskBytes - bytesUnmasked;
      const countToUnmask = Math.min(chunk.length, needed);
      const modified = new Uint8Array(chunk);
      for (let i = 0; i < countToUnmask; i++) {
        modified[i] ^= key[(bytesUnmasked + i) % key.length];
      }
      bytesUnmasked += countToUnmask;
      controller.enqueue(modified);
    },
  });
}

async function runBenchmark() {
  console.log('================================================================');
  console.log('   LIGHT-STORY STORAGE TIERING BENCHMARK & ROUND-TRIP AUDIT     ');
  console.log('   Model Evaluator: GPT-OSS 120B (Antigravity Engine)           ');
  console.log('================================================================\n');

  const FILE_SIZE = 20 * 1024 * 1024; // 20MB simulated chapter
  console.log(`[1] Generating 20MB (${FILE_SIZE.toLocaleString()} bytes) simulated chapter payload...`);
  const originalData = new Uint8Array(FILE_SIZE);

  // Set ZIP Local File Header magic bytes PK\x03\x04
  originalData[0] = 0x50; // 'P'
  originalData[1] = 0x4b; // 'K'
  originalData[2] = 0x03;
  originalData[3] = 0x04;

  // Fill remainder with pseudo-random byte patterns
  for (let i = 4; i < FILE_SIZE; i += 4) {
    const val = (i * 1664525 + 1013904223) >>> 0;
    originalData[i] = val & 0xff;
    if (i + 1 < FILE_SIZE) originalData[i + 1] = (val >>> 8) & 0xff;
    if (i + 2 < FILE_SIZE) originalData[i + 2] = (val >>> 16) & 0xff;
    if (i + 3 < FILE_SIZE) originalData[i + 3] = (val >>> 24) & 0xff;
  }

  const originalHash = crypto.createHash('sha256').update(originalData).digest('hex');
  console.log(`    Original SHA-256: ${originalHash}`);
  console.log(`    Original Magic:   0x${Buffer.from(originalData.slice(0, 4)).toString('hex')} (PK\\x03\\x04 - ZIP/CBZ)`);

  // Benchmark Raw In-Memory Header XOR (First 64KB chunk, 100,000 iterations)
  console.log('\n[2] Benchmarking Header XOR Camouflage (64KB typical first chunk, 100,000 iterations)...');
  const firstChunk = originalData.subarray(0, 64 * 1024);
  const iterations = 100_000;
  // warmup
  xorBufferHeader(firstChunk);
  const startRaw = performance.now();
  for (let i = 0; i < iterations; i++) {
    xorBufferHeader(firstChunk);
  }
  const endRaw = performance.now();
  const rawTotalTimeMs = endRaw - startRaw;
  const rawPerOpNs = (rawTotalTimeMs / iterations) * 1_000_000;
  const rawOpsPerSec = Math.round((iterations / rawTotalTimeMs) * 1000);

  console.log(`    Total time:       ${rawTotalTimeMs.toFixed(2)} ms`);
  console.log(`    Latency per op:   ${rawPerOpNs.toFixed(2)} ns (~${(rawPerOpNs / 1000).toFixed(4)} µs)`);
  console.log(`    Throughput:       ${rawOpsPerSec.toLocaleString()} ops/sec`);

  // Masking 20MB Archive (single pass)
  console.log('\n[3] Masking 20MB Archive for Google Drive Upload...');
  const tMaskStart = performance.now();
  const maskedData = xorBufferHeader(originalData);
  const tMaskEnd = performance.now();
  const maskedHash = crypto.createHash('sha256').update(maskedData).digest('hex');

  console.log(`    Masking duration: ${(tMaskEnd - tMaskStart).toFixed(4)} ms`);
  console.log(`    Masked SHA-256:   ${maskedHash}`);
  console.log(`    Masked Magic:     0x${Buffer.from(maskedData.slice(0, 4)).toString('hex')} (Obfuscated / Unrecognized)`);

  const isDifferent = maskedHash !== originalHash;
  const headerObfuscated = maskedData[0] !== 0x50 || maskedData[1] !== 0x4b;
  console.log(`    Signature check:  ${headerObfuscated ? 'SUCCESS (Scanner Evasion Confirmed)' : 'FAILED'}`);
  console.log(`    Hash modified:    ${isDifferent ? 'YES' : 'NO'}`);

  // Streaming Unmasking (Simulating 64KB HTTP chunks from GDrive -> Worker -> Client)
  const CHUNK_SIZE = 64 * 1024; // 64KB chunk (320 chunks total)
  console.log(`\n[4] Benchmarking Zero-Buffer Streaming Round-Trip (${CHUNK_SIZE / 1024}KB chunk size, 320 chunks)...`);
  
  const transformStream = createUnmaskTransformStream();
  const reader = transformStream.readable.getReader();
  const writer = transformStream.writable.getWriter();

  const memBefore = process.memoryUsage().heapUsed;
  const tStreamStart = performance.now();

  // Producer: Stream masked chunks asynchronously
  const writePromise = (async () => {
    for (let offset = 0; offset < FILE_SIZE; offset += CHUNK_SIZE) {
      const chunk = maskedData.subarray(offset, Math.min(offset + CHUNK_SIZE, FILE_SIZE));
      await writer.write(chunk);
    }
    await writer.close();
  })();

  // Consumer: Read stream to output
  const receivedChunks = [];
  let totalBytesReceived = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      receivedChunks.push(value);
      totalBytesReceived += value.length;
    }
  }
  await writePromise;

  const tStreamEnd = performance.now();
  const memAfter = process.memoryUsage().heapUsed;
  const streamDurationMs = tStreamEnd - tStreamStart;
  const streamThroughputMBs = (FILE_SIZE / (1024 * 1024)) / (streamDurationMs / 1000);

  console.log(`    Stream time:      ${streamDurationMs.toFixed(2)} ms`);
  console.log(`    Throughput:       ${streamThroughputMBs.toFixed(2)} MB/s (${(streamThroughputMBs * 8).toFixed(2)} Mbps)`);
  console.log(`    Chunks processed: ${receivedChunks.length}`);
  console.log(`    Heap delta:       ${((memAfter - memBefore) / (1024 * 1024)).toFixed(2)} MB`);

  // Concatenate received chunks to verify bit-for-bit
  console.log('\n[5] Bit-for-bit Round-Trip Verification...');
  const restoredData = new Uint8Array(totalBytesReceived);
  let pos = 0;
  for (const chunk of receivedChunks) {
    restoredData.set(chunk, pos);
    pos += chunk.length;
  }

  const restoredHash = crypto.createHash('sha256').update(restoredData).digest('hex');
  console.log(`    Restored SHA-256: ${restoredHash}`);
  console.log(`    Original SHA-256: ${originalHash}`);

  const hashesMatch = restoredHash === originalHash;
  const bytesMatch = Buffer.compare(Buffer.from(restoredData), Buffer.from(originalData)) === 0;

  console.log(`    Hash Check:       ${hashesMatch ? 'PERFECT MATCH (100% Bit-for-Bit)' : 'MISMATCH'}`);
  console.log(`    Byte Compare:     ${bytesMatch ? '0 differences out of ' + FILE_SIZE.toLocaleString() + ' bytes' : 'DIFF DETECTED'}`);

  if (hashesMatch && bytesMatch && headerObfuscated) {
    console.log('\n================================================================');
    console.log('>>> BENCHMARK & VERIFICATION RESULT: PASS (100% BIT-FOR-BIT) <<<');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error('\n>>> BENCHMARK & VERIFICATION RESULT: FAILED <<<');
    process.exit(1);
  }
}

runBenchmark().catch((err) => {
  console.error('Fatal error during benchmark:', err);
  process.exit(1);
});
