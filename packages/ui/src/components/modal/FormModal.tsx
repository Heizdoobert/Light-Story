'use client';

import { useState } from 'react';
import { Modal, Alert } from 'antd';
import { FormModalProps } from './types';

export function FormModal({
  title,
  open,
  onCancel,
  onSubmit,
  submitText = 'Lưu thay đổi',
  cancelText = 'Hủy',
  submitting: externalSubmitting,
  errorMessage,
  children,
  width = 600,
  maskClosable = false,
  destroyOnClose,
  destroyOnHidden = true,
  ...restProps
}: FormModalProps) {
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const isSubmitting = externalSubmitting ?? internalSubmitting;

  const handleOk = async () => {
    if (!onSubmit) {
      onCancel();
      return;
    }

    try {
      setInternalSubmitting(true);
      const res = await onSubmit();
      if (res !== false) {
        onCancel();
      }
    } finally {
      setInternalSubmitting(false);
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={submitText}
      cancelText={cancelText}
      confirmLoading={isSubmitting}
      width={width}
      maskClosable={maskClosable}
      destroyOnHidden={destroyOnHidden ?? destroyOnClose}
      okButtonProps={{
        style: { fontWeight: 600 },
      }}
      {...restProps}
    >
      {errorMessage && (
        <Alert
          message={errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <div style={{ marginTop: 12 }}>{children}</div>
    </Modal>
  );
}

export default FormModal;
