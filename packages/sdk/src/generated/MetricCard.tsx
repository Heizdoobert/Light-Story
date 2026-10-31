import dynamic from "next/dynamic";

// Lazy‑load the original UI component
const MetricCard = dynamic(() => import("../../../ui/src/components/card/MetricCard"), {
  ssr: false,
});

export default MetricCard;
