import React from 'react';

export const FilterBar: React.FC = () => {
  return (
    <div data-testid="filter-bar">
      <input placeholder="Filter..." />
      <button>Apply</button>
    </div>
  );
};
