import React, { useState } from 'react';

export interface FormModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const FormModal: React.FC<FormModalProps> = ({ isOpen = false, onClose }) => {
  const [open, setOpen] = useState(isOpen);
  const handleClose = () => {
    setOpen(false);
    onClose && onClose();
  };
  return (
    <div>
      <button data-testid="open-button" onClick={() => setOpen(true)}>Open</button>
      {open && (
        <div role="dialog" aria-modal="true" data-testid="form-modal">
          <h2>Modal Title</h2>
          <button onClick={handleClose}>Close</button>
        </div>
      )}
    </div>
  );
};
