"use client";

import { useState, type FC } from 'react';
import { CoreCard } from '@core/components/Card';
import { CoreInput } from '@core/components/Form';

export const FormValidationView: FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleValidate = () => {
    if (!email.includes('@')) {
      setError('Vui lòng nhập định dạng email hợp lệ (ví dụ: user@domain.com)');
    } else {
      setError('');
      alert('Email hợp lệ!');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <CoreCard title="Form Validation" subtitle="Kiểm tra dữ liệu đầu vào người dùng">
        <div className="space-y-4">
          <CoreInput
            label="Địa chỉ Email"
            placeholder="test@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <button
            type="button"
            onClick={handleValidate}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md"
          >
            Kiểm Tra Validation
          </button>
        </div>
      </CoreCard>
    </div>
  );
};

export default FormValidationView;
