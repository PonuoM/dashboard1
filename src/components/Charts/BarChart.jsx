import Chart from 'react-apexcharts';

function BarChart({ data, title }) {
    // data should be: [{ name: 'แหวว', fertilizer: 28500, bio: 57540, total: 86040 }, ...]

    const categories = data?.map(item => item.name) || [];
    const fertilizerData = data?.map(item => item.fertilizer || 0) || [];
    const bioData = data?.map(item => item.bio || 0) || [];

    const series = [
        {
            name: 'ปุ๋ย',
            data: fertilizerData,
        },
        {
            name: 'ชีวภัณฑ์',
            data: bioData,
        },
    ];

    const options = {
        chart: {
            type: 'bar',
            stacked: true,
            fontFamily: 'inherit',
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '70%',
            },
        },
        colors: ['#3b82f6', '#22c55e'],
        dataLabels: {
            enabled: false,
        },
        stroke: {
            width: 1,
            colors: ['#fff'],
        },
        xaxis: {
            categories: categories,
            labels: {
                formatter: function (val) {
                    return new Intl.NumberFormat('th-TH').format(val);
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    fontSize: '13px',
                },
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
        fill: {
            opacity: 1,
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
        },
        grid: {
            borderColor: '#e2e8f0',
        },
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
            <Chart options={options} series={series} type="bar" height={400} />
        </div>
    );
}

export default BarChart;
