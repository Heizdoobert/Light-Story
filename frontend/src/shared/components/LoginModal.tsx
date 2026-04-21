import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Loader2, LogIn, UserPlus, KeyRound } from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>('signin');
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-white/20"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {mode === 'signin' && 'Welcome back'}
                    {mode === 'register' && 'Create account'}
                    {mode === 'forgot' && 'Reset password'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                    {mode === 'signin' && 'Sign in to continue your experience.'}
                    {mode === 'register' && 'Register as a user account. Admin roles are assigned by superadmin.'}
                    {mode === 'forgot' && 'Enter your email to receive a password reset link.'}
                  </p>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 dark:bg-cyan-400 py-4 rounded-2xl text-white dark:text-slate-950 font-black text-sm shadow-xl shadow-slate-900/10 dark:shadow-cyan-400/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      {mode === 'signin' && <LogIn size={18} />}
                      {mode === 'register' && <UserPlus size={18} />}
                      {mode === 'forgot' && <Mail size={18} />}
                      {mode === 'signin' && 'Sign In'}
                      {mode === 'register' && 'Create Account'}
                      {mode === 'forgot' && 'Send Reset Link'}
                    </>
                  )}
                </button>

                {mode === 'signin' && (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          await signIn();
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      className="w-full border border-slate-200 dark:border-slate-700 py-3 rounded-2xl text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      Continue with Google
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
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
                      }}
                      disabled={isSubmitting}
                      className="w-full border border-slate-200 dark:border-slate-700 py-3 rounded-2xl text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      Send Magic Link
                    </button>
                  </div>
                )}
              </form>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-center gap-3 text-xs font-bold">
                  {mode !== 'signin' && (
                    <button onClick={() => setMode('signin')} className="text-slate-500 hover:text-primary">
                      Sign in
                    </button>
                  )}
                  {mode !== 'register' && (
                    <button onClick={() => setMode('register')} className="text-slate-500 hover:text-primary">
                      Register
                    </button>
                  )}
                  {mode !== 'forgot' && (
                    <button onClick={() => setMode('forgot')} className="text-slate-500 hover:text-primary">
                      Forgot password
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
