"use client";

import { useState, type FC, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CoreInput } from '@core/components/Form';
import { Sparkles, ArrowRight } from 'lucide-react';

export const LoginView: FC = () => {
  const router = useRouter();
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
        <h2 className="text-2xl font-bold text-slate-100">Đăng Nhập Quản Trị</h2>
        <p className="text-sm text-slate-400">Nhập thông tin tài khoản của bạn để tiếp tục</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center space-x-2 cursor-pointer text-slate-400">
            <input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0" />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <a href="#" className="text-indigo-400 hover:underline">Quên mật khẩu?</a>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
        >
          <span>Đăng Nhập</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-sm text-slate-400">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-indigo-400 font-semibold hover:underline">
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
};

export default LoginView;
