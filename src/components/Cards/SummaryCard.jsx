import './SummaryCard.css';

function SummaryCard({ title, value, subtitle, icon, color = 'blue' }) {
    const formatNumber = (num) => {
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('th-TH').format(num);
    };

    const formatCurrency = (num) => {
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    const displayValue = typeof value === 'number' && title.includes('บาท')
        ? formatCurrency(value)
        : formatNumber(value);

    return (
        <div className={`summary-card summary-card--${color}`}>
            <div className="summary-card__icon">{icon}</div>
            <div className="summary-card__content">
                <h3 className="summary-card__title">{title}</h3>
                <p className="summary-card__value">{displayValue}</p>
                {subtitle && <span className="summary-card__subtitle">{subtitle}</span>}
            </div>
        </div>
    );
}

export default SummaryCard;
