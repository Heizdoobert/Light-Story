import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { useModalA11y } from '../use-modal-a11y';

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(true);
  const [name, setName] = useState('');
  const closeModalRef = useModalA11y(isOpen, () => setIsOpen(false));

  if (!isOpen) return null;

  return (
    <div>
      <button ref={closeModalRef} aria-label="close" onClick={() => setIsOpen(false)}>
        X
      </button>
      <input
        aria-label="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>
  );
}

describe('useModalA11y', () => {
  it('keeps focus in the input while typing, despite a fresh inline onClose each render', () => {
    render(<ModalHarness />);

    const input = screen.getByLabelText('name');
    input.focus();
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'H' } });
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'Hi' } });
    expect(input).toHaveFocus();
  });

  it('still closes the modal on Escape', () => {
    render(<ModalHarness />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByLabelText('name')).not.toBeInTheDocument();
  });
});
