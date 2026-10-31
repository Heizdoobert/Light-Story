'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Skeleton, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
const { Text } = Typography;
const TREND_CONFIG = {
    up: { icon: _jsx(ArrowUpOutlined, {}), color: '#10b981' },
    down: { icon: _jsx(ArrowDownOutlined, {}), color: '#ef4444' },
    neutral: { icon: _jsx(MinusOutlined, {}), color: '#9ca3af' },
};
export function MetricCard({ title, value, prefix, suffix, icon, trend, description, loading = false, className, ...restProps }) {
    const cardClassName = ['light-story-metric-card', className].filter(Boolean).join(' ');
    if (loading) {
        return (_jsx(Card, { className: cardClassName, ...restProps, children: _jsx(Skeleton, { active: true, paragraph: { rows: 2 } }) }));
    }
    const renderTrend = () => {
        if (!trend)
            return null;
        const { icon: iconNode, color } = TREND_CONFIG[trend.direction] ?? TREND_CONFIG.neutral;
        return (_jsxs(Space, { size: 4, style: { color, fontSize: 13, fontWeight: 600 }, children: [iconNode, _jsx("span", { children: trend.value }), trend.label && (_jsx(Text, { type: "secondary", style: { fontSize: 12, marginLeft: 4 }, children: trend.label }))] }));
    };
    return (_jsxs(Card, { className: cardClassName, styles: { body: { padding: '20px 24px' } }, ...restProps, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }, children: title }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', marginTop: 8, gap: 4 }, children: [prefix && _jsx("span", { style: { fontSize: 20, color: '#9ca3af' }, children: prefix }), _jsx("span", { style: { fontSize: 28, fontWeight: 700, lineHeight: 1.2 }, children: value }), suffix && _jsx("span", { style: { fontSize: 14, color: '#9ca3af' }, children: suffix })] })] }), icon && (_jsx("div", { style: {
                            padding: 10,
                            borderRadius: 10,
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            color: '#f97316',
                            fontSize: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: icon }))] }), (trend || description) && (_jsxs("div", { style: { marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [renderTrend(), description && (_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: description }))] }))] }));
}
export default MetricCard;
//# sourceMappingURL=MetricCard.js.map