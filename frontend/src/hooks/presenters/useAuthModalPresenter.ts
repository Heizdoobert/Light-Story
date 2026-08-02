"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export type AuthModalMode = 'signin' | 'register' | 'forgot';

export interface UseAuthModalPresenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function useAuthModalPresenter({ isOpen, onClose }: UseAuthModalPresenterProps) {
  const [mode, setMode] = useState<AuthModalMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signInWithEmail, signInWithPassword, register, sendPasswordReset } = useAuth();

  const resetLocalState = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMode('signin');
  };

  useEffect(() => {
    if (!isOpen) {
      resetLocalState();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetLocalState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        if (!password) {
          toast.error('Please enter your password');
          return;
        }
        await signInWithPassword(email, password);
        toast.success('Signed in successfully');
        handleClose();
        return;
      }

      if (mode === 'register') {
        if (!fullName.trim()) {
          toast.error('Please enter your full name');
          return;
        }
        if (!password) {
          toast.error('Please enter your password');
          return;
        }
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }
        if (password !== confirmPassword) {
          toast.error('Password confirmation does not match');
          return;
        }

        await register(email, password, fullName.trim());
        toast.success('Registration successful. Please check your email to verify your account.');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      await sendPasswordReset(email);
      toast.success('Password reset email sent. Please check your inbox.');
      setMode('signin');
    } catch (error) {
      // Error handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signIn();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkSignIn = async () => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmail(email);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    mode,
    setMode,
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    handleClose,
    handleSubmit,
    handleGoogleSignIn,
    handleMagicLinkSignIn,
    resetLocalState,
  };
}
