'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Modal, Alert } from 'antd';
export function FormModal({ title, open, onCancel, onSubmit, submitText = 'Lưu thay đổi', cancelText = 'Hủy', submitting: externalSubmitting, errorMessage, children, width = 600, maskClosable = false, destroyOnClose, destroyOnHidden = true, ...restProps }) {
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
        }
        finally {
            setInternalSubmitting(false);
        }
    };
    return (_jsxs(Modal, { title: title, open: open, onOk: handleOk, onCancel: onCancel, okText: submitText, cancelText: cancelText, confirmLoading: isSubmitting, width: width, maskClosable: maskClosable, destroyOnHidden: destroyOnHidden ?? destroyOnClose, okButtonProps: {
            style: { fontWeight: 600 },
        }, ...restProps, children: [errorMessage && (_jsx(Alert, { message: errorMessage, type: "error", showIcon: true, style: { marginBottom: 16 } })), _jsx("div", { style: { marginTop: 12 }, children: children })] }));
}
export default FormModal;
//# sourceMappingURL=FormModal.js.map