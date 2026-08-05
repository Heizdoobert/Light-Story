"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function useResetPasswordPresenter() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const { updatePassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const type = params.get('type');

    const verifyRecovery = async () => {
      try {
        const fromRecoveryLink = type === 'recovery';
        setIsRecoveryFlow(fromRecoveryLink);
      } finally {
        setVerifying(false);
      }
    };

    verifyRecovery();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Password confirmation does not match');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      toast.success('Password updated. Please sign in again.');
      router.replace('/');
    } catch {
      // Error already handled in context
    } finally {
      setSubmitting(false);
    }
  };

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    submitting,
    verifying,
    isRecoveryFlow,
    handleSubmit,
  };
}
