import dynamic from "next/dynamic";

// Lazy‑load the original UI component
const FilterBar = dynamic(() => import("../../../ui/src/components/filter/FilterBar"), {
  ssr: false,
});

export default FilterBar;
