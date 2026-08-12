import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './modal';

function Harness({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <button>Open background</button>
      <Modal isOpen onClose={onClose ?? (() => {})} title="Test modal">
        <label htmlFor="name">Name</label>
        <input id="name" />
        <button type="button">Save</button>
      </Modal>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.style.overflow = 'unset';
});

describe('Modal', () => {
  it('focuses the close button on open', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Đóng')).toHaveFocus();
  });

  it('keeps focus in the input while typing, despite a fresh inline onClose each render', () => {
    let onClose = () => {};
    const { rerender } = render(<Harness onClose={onClose} />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    input.focus();

    fireEvent.change(input, { target: { value: 'H' } });
    onClose = () => {};
    rerender(<Harness onClose={onClose} />);
    expect(input).toHaveFocus();
  });

  it('closes on Escape via the latest onClose', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus inside the dialog', () => {
    render(<Harness />);
    const close = screen.getByLabelText('Đóng');
    const save = screen.getByRole('button', { name: 'Save' });

    save.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();
  });

  it('restores focus to the previously focused element on close', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button>Trigger</button>
        <Modal isOpen={false} onClose={onClose} title="T">
          <button type="button">Inner</button>
        </Modal>
      </>
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    trigger.focus();

    rerender(
      <>
        <button>Trigger</button>
        <Modal isOpen onClose={onClose} title="T">
          <button type="button">Inner</button>
        </Modal>
      </>
    );
    const inner = screen.getByRole('button', { name: 'Inner' });
    inner.focus();

    rerender(
      <>
        <button>Trigger</button>
        <Modal isOpen={false} onClose={onClose} title="T">
          <button type="button">Inner</button>
        </Modal>
      </>
    );
    expect(trigger).toHaveFocus();
  });
});
