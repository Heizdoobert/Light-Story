import dynamic from "next/dynamic";

// Lazy‑load the original UI component
const FormModal = dynamic(() => import("../../../ui/src/components/modal/FormModal"), {
  ssr: false,
});

export default FormModal;
