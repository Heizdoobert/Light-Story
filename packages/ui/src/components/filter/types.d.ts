import React from 'react';
export interface FilterBarProps {
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onSearchSubmit?: (value: string) => void;
    searchPlaceholder?: string;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
    onReset?: () => void;
    resetText?: string;
    className?: string;
    style?: React.CSSProperties;
}
