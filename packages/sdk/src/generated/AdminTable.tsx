import dynamic from "next/dynamic";

// Lazy‑load the original UI component
const AdminTable = dynamic(() => import("../../../ui/src/components/table/AdminTable"), {
  ssr: false,
});

export default AdminTable;
