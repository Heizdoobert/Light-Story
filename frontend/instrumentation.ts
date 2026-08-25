export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ponytail: Next dev attaches per-request close listeners to ServerResponse
    // (count stable at 11, not a leak); raise Node's warn threshold to silence.
    (await import('node:http')).ServerResponse.prototype.setMaxListeners(20);
  }
}
