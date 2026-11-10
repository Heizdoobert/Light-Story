#!/usr/bin/env node
/**
 * Zero-dependency Lightweight Benchmark Utility for Light-Story Gateway
 * Uses native fetch and performance.now() - no npm packages required.
 *
 * Usage:
 *   node scripts/perf/benchmark.mjs [url] [concurrency] [requests]
 *
 * Example:
 *   node scripts/perf/benchmark.mjs http://localhost:8787/api/v1/stories 10 100
 */

const targetUrl = process.argv[2] || 'http://localhost:8787/api/v1/stories';
const concurrency = parseInt(process.argv[3] || '5', 10);
const totalRequests = parseInt(process.argv[4] || '50', 10);

console.log(`\n======================================================`);
console.log(`🚀 Light-Story Benchmark Runner`);
console.log(`Target:      ${targetUrl}`);
console.log(`Concurrency: ${concurrency}`);
console.log(`Requests:    ${totalRequests}`);
console.log(`======================================================\n`);

async function runBenchmark() {
  const latencies = [];
  let successful = 0;
  let failed = 0;
  let completed = 0;

  async function worker() {
    while (completed < totalRequests) {
      const idx = completed++;
      const start = performance.now();
      try {
        const res = await fetch(targetUrl, {
          headers: { 'Accept': 'application/json' },
        });
        const duration = performance.now() - start;
        latencies.push(duration);
        if (res.ok) {
          successful++;
        } else {
          failed++;
        }
      } catch (err) {
        latencies.push(performance.now() - start);
        failed++;
      }
    }
  }

  const overallStart = performance.now();
  const pool = Array.from({ length: concurrency }, () => worker());
  await Promise.all(pool);
  const totalDuration = (performance.now() - overallStart) / 1000;

  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const avg = sum / latencies.length || 0;
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = (successful + failed) / totalDuration;

  console.log(`📊 Benchmark Summary:`);
  console.log(`------------------------------------------------------`);
  console.log(`Total Time:     ${totalDuration.toFixed(2)}s`);
  console.log(`Requests/sec:   ${rps.toFixed(1)} req/s`);
  console.log(`Successful:     ${successful}`);
  console.log(`Failed:         ${failed} (${((failed / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`------------------------------------------------------`);
  console.log(`Avg Latency:    ${avg.toFixed(2)} ms`);
  console.log(`p50 (median):   ${p50.toFixed(2)} ms`);
  console.log(`p95 Latency:    ${p95.toFixed(2)} ms`);
  console.log(`p99 Latency:    ${p99.toFixed(2)} ms`);
  console.log(`Min Latency:    ${(latencies[0] || 0).toFixed(2)} ms`);
  console.log(`Max Latency:    ${(latencies[latencies.length - 1] || 0).toFixed(2)} ms`);
  console.log(`======================================================\n`);
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
