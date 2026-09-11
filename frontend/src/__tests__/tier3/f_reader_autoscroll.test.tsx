import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState, useEffect, useRef } from 'react';

function AutoScrollReader() {
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);
  const autoScrollSpeedRef = useRef(0);

  useEffect(() => {
    autoScrollSpeedRef.current = autoScrollSpeed;
  }, [autoScrollSpeed]);

  useEffect(() => {
    let animId: number;
    const scrollStep = () => {
      if (autoScrollSpeedRef.current > 0) {
        window.scrollBy(0, autoScrollSpeedRef.current * 0.75);
      }
      animId = requestAnimationFrame(scrollStep);
    };
    if (autoScrollSpeed > 0) {
      animId = requestAnimationFrame(scrollStep);
    }
    return () => cancelAnimationFrame(animId);
  }, [autoScrollSpeed]);

  useEffect(() => {
    if (autoScrollSpeed === 0) return;
    const stop = () => setAutoScrollSpeed(0);
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchmove', stop, { passive: true });
    return () => {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
    };
  }, [autoScrollSpeed]);

  return (
    <div>
      <span data-testid="speed">{autoScrollSpeed}</span>
      <button onClick={() => setAutoScrollSpeed((p) => (p >= 3 ? 0 : p + 1))}>
        Toggle
      </button>
    </div>
  );
}

describe('auto-scroll cancel on manual scroll', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('wheel event cancels auto-scroll', async () => {
    render(<AutoScrollReader />);
    const btn = screen.getByRole('button', { name: 'Toggle' });

    // Start auto-scroll: 0 → 1
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByTestId('speed').textContent).toBe('1');

    // Manual wheel cancels it
    await act(async () => { fireEvent.wheel(window); });
    expect(screen.getByTestId('speed').textContent).toBe('0');
  });

  it('touchmove event cancels auto-scroll', async () => {
    render(<AutoScrollReader />);
    const btn = screen.getByRole('button', { name: 'Toggle' });

    // Start auto-scroll: 0 → 1
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByTestId('speed').textContent).toBe('1');

    // Manual touchmove cancels it
    await act(async () => {
      fireEvent.touchMove(window, { touches: [{ clientX: 0, clientY: 100 }] });
    });
    expect(screen.getByTestId('speed').textContent).toBe('0');
  });

  it('listeners are removed after auto-scroll stops', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    render(<AutoScrollReader />);
    const btn = screen.getByRole('button', { name: 'Toggle' });

    // Start auto-scroll
    await act(async () => { fireEvent.click(btn); });
    const beforeCount = removeSpy.mock.calls.length;

    // Stop it
    await act(async () => { fireEvent.wheel(window); });

    // Both wheel and touchmove should have been removed
    const removedEvents = removeSpy.mock.calls.slice(beforeCount).map(c => c[0]);
    expect(removedEvents).toContain('wheel');
    expect(removedEvents).toContain('touchmove');
    removeSpy.mockRestore();
  });
});
