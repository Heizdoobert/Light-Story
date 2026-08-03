"use client";

import { useState, type FC, type FormEvent } from 'react';
import { CoreCard } from '@core/components/Card';
import { Send } from 'lucide-react';

export const ChatView: FC = () => {
  const [messages, setMessages] = useState([
    { sender: 'Super Admin', text: 'Xin chào team, tình hình hệ thống hôm nay thế nào?', time: '10:00 AM', isMe: false },
    { sender: 'Bạn', text: 'Mọi dịch vụ đang chạy 100% ổn định anh nhé.', time: '10:02 AM', isMe: true },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: 'Bạn', text: input, time: 'Vừa xong', isMe: true }]);
    setInput('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[75vh]">
      <CoreCard className="p-4" title="Trò Chuyện">
        <div className="space-y-3">
          {[
            { name: 'Kỹ Thuật Viên', status: 'Online', role: 'Support' },
            { name: 'Biên Tập Viên', status: 'Offline', role: 'Content' },
          ].map((u, i) => (
            <div key={i} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-800 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                {u.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold">{u.name}</p>
                <p className="text-xs text-slate-400">{u.role}</p>
              </div>
            </div>
          ))}
        </div>
      </CoreCard>

      <CoreCard className="lg:col-span-3 flex flex-col justify-between" title="Kênh Kỹ Thuật Nội Bộ">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-md p-3.5 rounded-2xl text-sm ${m.isMe ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                <p className="text-xs font-semibold opacity-75 mb-1">{m.sender}</p>
                <p>{m.text}</p>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">{m.time}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="mt-4 flex space-x-2">
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl outline-none text-sm"
          />
          <button type="submit" className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </CoreCard>
    </div>
  );
};

export default ChatView;
