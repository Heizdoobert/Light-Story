/**
 * Abort only while waiting for response headers. Once headers arrive the timer is cleared,
 * so large or streamed bodies (storage downloads, big REST pages) are never cut mid-transfer.
 * A caller-provided signal still aborts at any time.
 */
export async function fetchWithHeaderTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('Upstream did not respond in time', 'TimeoutError')),
    timeoutMs,
  );
  const external = init.signal;
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', () => controller.abort(external.reason), { once: true });
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
