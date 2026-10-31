import { FormModalProps } from './types';
export declare function FormModal({ title, open, onCancel, onSubmit, submitText, cancelText, submitting: externalSubmitting, errorMessage, children, width, maskClosable, destroyOnClose, destroyOnHidden, ...restProps }: FormModalProps): import("react").JSX.Element;
export default FormModal;
