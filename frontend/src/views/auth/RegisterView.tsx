"use client";

import { useState, type FC, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CoreInput } from '@core/components/Form';
import { Sparkles, ArrowRight } from 'lucide-react';

export const RegisterView: FC = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div className="w-full max-w-md p-8 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Đăng Ký Tài Khoản</h2>
        <p className="text-sm text-slate-400">Tạo tài khoản quản trị mới</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <CoreInput
          label="Họ và Tên"
          type="text"
          placeholder="Nguyen Van A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <CoreInput
          label="Email"
          type="email"
          placeholder="admin@lightstory.vn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <CoreInput
          label="Mật Khẩu"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
        >
          <span>Đăng Ký</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-sm text-slate-400">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-indigo-400 font-semibold hover:underline">
          Đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default RegisterView;
