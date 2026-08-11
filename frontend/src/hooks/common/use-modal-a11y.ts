"use client";

// ponytail: minimal a11y for inline modals — Escape to close + initial focus.
// Swap for <Modal> only when a dark-theme variant exists.
import { useEffect, useRef } from 'react';

export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return closeRef;
}
