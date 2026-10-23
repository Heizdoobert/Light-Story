import React from 'react';
import { ModalProps } from 'antd';

export interface FormModalProps extends Omit<ModalProps, 'onOk'> {
  title: React.ReactNode;
  open: boolean;
  onCancel: () => void;
  onSubmit?: () => Promise<boolean | void> | boolean | void;
  submitText?: string;
  cancelText?: string;
  submitting?: boolean;
  errorMessage?: string | null;
  destroyOnHidden?: boolean;
  children: React.ReactNode;
}
