import Chart from 'react-apexcharts';

function PieChart({ data, title }) {
    // data should be: [{ name: 'ปุ๋ย', value: 384490 }, { name: 'ชีวภัณฑ์', value: 687470 }]

    const series = data?.map(item => item.value) || [];
    const labels = data?.map(item => item.name) || [];

    const options = {
        chart: {
            type: 'donut',
            fontFamily: 'inherit',
        },
        labels: labels,
        colors: ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444'],
        legend: {
            position: 'bottom',
            fontSize: '14px',
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val.toFixed(1) + '%';
            },
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return new Intl.NumberFormat('th-TH', {
                        style: 'currency',
                        currency: 'THB',
                        minimumFractionDigits: 0,
                    }).format(val);
                },
            },
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '60%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'รวม',
                            formatter: function (w) {
                                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return new Intl.NumberFormat('th-TH').format(total) + ' ฿';
                            },
                        },
                    },
                },
            },
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        width: 300,
                    },
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        ],
    };

    if (!data || data.length === 0) {
        return (
            <div className="chart-container">
                <h3 className="chart-title">{title}</h3>
                <p className="chart-empty">ไม่มีข้อมูล</p>
            </div>
        );
    }

    return (
        <div className="chart-container">
            {title && <h3 className="chart-title">{title}</h3>}
            <Chart options={options} series={series} type="donut" height={300} />
        </div>
    );
}

export default PieChart;
