'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
export function FilterBar({ searchValue, onSearchChange, onSearchSubmit, searchPlaceholder = 'Tìm kiếm...', filters, actions, onReset, resetText = 'Đặt lại', className, style, }) {
    return (_jsxs("div", { className: `light-story-filter-bar ${className || ''}`, style: {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
            ...style,
        }, children: [_jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, flex: 1 }, children: [(onSearchChange || onSearchSubmit) && (_jsx(Input, { prefix: _jsx(SearchOutlined, { style: { color: '#9ca3af' } }), placeholder: searchPlaceholder, value: searchValue, onChange: (e) => onSearchChange?.(e.target.value), onPressEnter: (e) => onSearchSubmit?.(e.target.value), allowClear: true, style: { width: 260, maxWidth: '100%' } })), filters, onReset && (_jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: onReset, children: resetText }))] }), actions && _jsx(Space, { wrap: true, children: actions })] }));
}
export default FilterBar;
//# sourceMappingURL=FilterBar.js.map