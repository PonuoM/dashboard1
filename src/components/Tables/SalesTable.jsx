import './SalesTable.css';

function SalesTable({ data, title, showRole = false }) {
    const formatNumber = (num) => {
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('th-TH').format(num);
    };

    const formatCurrency = (num) => {
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('th-TH').format(num);
    };

    if (!data || data.length === 0) {
        return (
            <div className="sales-table-container">
                {title && <h3 className="sales-table-title">{title}</h3>}
                <p className="sales-table-empty">ไม่มีข้อมูล</p>
            </div>
        );
    }

    return (
        <div className="sales-table-container">
            {title && <h3 className="sales-table-title">{title}</h3>}
            <div className="sales-table-wrapper">
                <table className="sales-table">
                    <thead>
                        <tr>
                            <th className="col-name">ชื่อพนักงาน</th>
                            {showRole && <th className="col-role">ตำแหน่ง</th>}
                            <th className="col-number">จำนวนปุ๋ย</th>
                            <th className="col-money">ยอดปุ๋ย</th>
                            <th className="col-number">จำนวนชีวภัณฑ์</th>
                            <th className="col-money">ยอดชีวภัณฑ์</th>
                            <th className="col-money col-total">ยอดรวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={row.user_id || index}>
                                <td className="col-name">{row.salesperson_name}</td>
                                {showRole && <td className="col-role">{row.role_name}</td>}
                                <td className="col-number">{formatNumber(row.fertilizer_qty)}</td>
                                <td className="col-money">{formatCurrency(row.fertilizer_sales)}</td>
                                <td className="col-number">{formatNumber(row.bio_qty)}</td>
                                <td className="col-money">{formatCurrency(row.bio_sales)}</td>
                                <td className="col-money col-total">
                                    <strong>{formatCurrency(row.total_sales)}</strong>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={showRole ? 2 : 1}><strong>รวม ({data.length} คน)</strong></td>
                            <td className="col-number">
                                <strong>{formatNumber(data.reduce((sum, r) => sum + (r.fertilizer_qty || 0), 0))}</strong>
                            </td>
                            <td className="col-money">
                                <strong>{formatCurrency(data.reduce((sum, r) => sum + (r.fertilizer_sales || 0), 0))}</strong>
                            </td>
                            <td className="col-number">
                                <strong>{formatNumber(data.reduce((sum, r) => sum + (r.bio_qty || 0), 0))}</strong>
                            </td>
                            <td className="col-money">
                                <strong>{formatCurrency(data.reduce((sum, r) => sum + (r.bio_sales || 0), 0))}</strong>
                            </td>
                            <td className="col-money col-total">
                                <strong>{formatCurrency(data.reduce((sum, r) => sum + (r.total_sales || 0), 0))}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default SalesTable;
