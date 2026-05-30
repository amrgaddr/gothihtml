// Chart Utilities - Refactored helper functions for chart rendering

// Constants
const MONTHS_ORDER = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", 
                      "يوليو", "اغسطس", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر"];

// Helper: Aggregate data by hospital
function aggregateByHospital(data, valueExtractor) {
    const hospitals = [...new Set(data.map(item => item["المستشفى"]))];
    const hospitalTotals = hospitals.map(hospital => {
        const hospitalData = data.filter(item => item["المستشفى"] === hospital);
        const total = valueExtractor(hospitalData);
        return { hospital, total };
    });
    hospitalTotals.sort((a, b) => b.total - a.total);
    return hospitalTotals.slice(0, 30);
}

// Helper: Aggregate data by month
function aggregateByMonth(data, valueExtractor) {
    return MONTHS_ORDER.map(month => {
        const monthData = data.filter(item => item["الشهر"] === month);
        return valueExtractor(monthData);
    });
}

// Helper: Get data based on filter configuration
function getDataForViewMode(config, viewMode, hospitalFilter, monthFilter, allData, currentMonthName) {
    const hospitalFilterActive = hospitalFilter.value !== 'all';
    const monthFilterActive = monthFilter.value !== 'all';
    
    if (viewMode === 'hospitals') {
        if (monthFilterActive && !hospitalFilterActive) {
            // Specific month, show hospitals for that month
            const filteredByMonth = config.getData(allData).filter(item => item["الشهر"] === monthFilter.value);
            return {
                labels: aggregateByHospital(filteredByMonth, config.valueExtractor).map(h => h.hospital),
                data: aggregateByHospital(filteredByMonth, config.valueExtractor).map(h => h.total)
            };
        } else if (!hospitalFilterActive && !monthFilterActive) {
            // No filters, use current month
            const currentMonthData = config.getData(allData).filter(item => item["الشهر"] === currentMonthName);
            return {
                labels: aggregateByHospital(currentMonthData, config.valueExtractor).map(h => h.hospital),
                data: aggregateByHospital(currentMonthData, config.valueExtractor).map(h => h.total)
            };
        } else if (hospitalFilterActive && monthFilterActive) {
            // Both filters active
            const filteredData = config.getData(allData).filter(item => 
                item["المستشفى"] === hospitalFilter.value && item["الشهر"] === monthFilter.value
            );
            return {
                labels: [hospitalFilter.value],
                data: [config.valueExtractor(filteredData)]
            };
        } else {
            // Hospital filter only
            const filteredByHospital = config.getData(allData).filter(item => item["المستشفى"] === hospitalFilter.value);
            return {
                labels: aggregateByHospital(filteredByHospital, config.valueExtractor).map(h => h.hospital),
                data: aggregateByHospital(filteredByHospital, config.valueExtractor).map(h => h.total)
            };
        }
    } else {
        // View by months
        if (hospitalFilterActive) {
            const filteredByHospital = config.getData(allData).filter(item => item["المستشفى"] === hospitalFilter.value);
            return {
                labels: MONTHS_ORDER,
                data: aggregateByMonth(filteredByHospital, config.valueExtractor)
            };
        } else {
            return {
                labels: MONTHS_ORDER,
                data: aggregateByMonth(config.getData(allData), config.valueExtractor)
            };
        }
    }
}

// Generic chart update function
function updateChartGeneric(config, viewMode, hospitalFilter, monthFilter, allData, currentMonthName) {
    const canvasId = config.canvasId;
    const canvasElement = document.getElementById(canvasId);
    
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    
    // Destroy old chart if exists
    if (specialtyCharts[config.chartKey]) {
        specialtyCharts[config.chartKey].destroy();
    }
    
    // Get chart data
    const chartData = getDataForViewMode(config, viewMode, hospitalFilter, monthFilter, allData, currentMonthName);
    
    // Update chart title if provided
    if (config.titleSelector) {
        const titleElement = document.querySelector(config.titleSelector);
        if (titleElement) {
            titleElement.innerHTML = config.getTitle(viewMode, hospitalFilter, monthFilter, currentMonthName);
        }
    }
    
    // Create new chart
    specialtyCharts[config.chartKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: config.label,
                data: chartData.data,
                backgroundColor: config.backgroundColor,
                borderColor: config.borderColor,
                borderWidth: 1
            }]
        },
        options: config.chartOptions || {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatNumber(context.raw);
                        }
                    }
                },
                datalabels: {
                    anchor: 'center',
                    align: 'top',
                    rotation: -90,
                    offset: 20,
                    formatter: function(value) {
                        return formatNumber(value);
                    },
                    color: '#333',
                    font: { weight: 'bold', size: 12 },
                    padding: 4
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// Configuration for beds chart
const bedsChartConfig = {
    canvasId: 'beds-chart',
    chartKey: 'beds',
    label: 'إجمالي الأسرة',
    backgroundColor: '#1a73e880',
    borderColor: '#1a73e8',
    titleSelector: '#beds-tab .chart-header h3',
    getData: (allData) => allData,
    valueExtractor: (hospitalData) => {
        if (hospitalData.length === 0) return 0;
        let total = 0;
        bedsData.forEach(bedType => {
            total += hospitalData[0][bedType.id] || 0;
        });
        return total;
    },
    getTitle: (viewMode, hospitalFilter, monthFilter, currentMonthName) => {
        const hospitalFilterActive = hospitalFilter.value !== 'all';
        const monthFilterActive = monthFilter.value !== 'all';
        
        if (viewMode === 'hospitals' && monthFilterActive) {
            return `<i class="fas fa-chart-bar"></i> أعلى مستشفيات حسب إجمالي الأسرة (شهر ${monthFilter.value})`;
        } else if (viewMode === 'hospitals' && !monthFilterActive) {
            return `<i class="fas fa-chart-bar"></i> أعلى مستشفيات حسب إجمالي الأسرة (شهر ${currentMonthName})`;
        } else if (viewMode === 'months' && hospitalFilterActive) {
            return `<i class="fas fa-chart-bar"></i> إجمالي الأسرة حسب الشهور (مستشفى ${hospitalFilter.value})`;
        } else {
            return `<i class="fas fa-chart-bar"></i> إجمالي الأسرة حسب الشهور (جميع المستشفيات)`;
        }
    }
};

// Configuration for endoscopies chart
const endoscopiesChartConfig = {
    canvasId: 'endoscopies-chart',
    chartKey: 'endoscopies',
    label: 'إجمالي المناظير',
    backgroundColor: '#34a85380',
    borderColor: '#34a853',
    titleSelector: '#endoscopies-tab .chart-header h3',
    getData: (allData) => endoscopiesData,
    valueExtractor: (hospitalData) => {
        let total = 0;
        endoscopiesDataNames.forEach(endoscopy => {
            const endoscopiesBySpecialty = hospitalData.filter(item => item["التخصص"] === endoscopy.id);
            total += endoscopiesBySpecialty.reduce((sum, item) => sum + (item["عدد الحالات"] || 0), 0);
        });
        return total;
    },
    getTitle: (viewMode, hospitalFilter, monthFilter, currentMonthName) => {
        const hospitalFilterActive = hospitalFilter.value !== 'all';
        const monthFilterActive = monthFilter.value !== 'all';
        
        if (viewMode === 'hospitals' && monthFilterActive) {
            return `<i class="fas fa-chart-bar"></i> أعلى مستشفيات حسب إجمالي المناظير (شهر ${monthFilter.value})`;
        } else if (viewMode === 'hospitals' && !monthFilterActive) {
            return `<i class="fas fa-chart-bar"></i> أعلى مستشفيات حسب إجمالي المناظير`;
        } else if (viewMode === 'months' && hospitalFilterActive) {
            return `<i class="fas fa-chart-bar"></i> إجمالي المناظير حسب الشهور (مستشفى ${hospitalFilter.value})`;
        } else {
            return `<i class="fas fa-chart-bar"></i> إجمالي المناظير حسب الشهور (جميع المستشفيات)`;
        }
    }
};

// Configuration for specialty chart (dynamic)
function createSpecialtyChartConfig(specialtyId, specialty) {
    return {
        canvasId: `${specialtyId}-chart`,
        chartKey: specialtyId,
        label: specialty.name,
        backgroundColor: specialty.color + '80',
        borderColor: specialty.color,
        getData: (allData) => filterData().filteredData,
        valueExtractor: (hospitalData) => {
            return hospitalData.reduce((sum, item) => sum + (item[specialtyId] || 0), 0);
        },
        getTitle: (viewMode, hospitalFilter, monthFilter, currentMonthName) => {
            return specialty.name;
        }
    };
}

// Refactored chart update functions
function updateBedsChart(viewMode) {
    updateChartGeneric(bedsChartConfig, viewMode, hospitalFilter, monthFilter, allData, currentMonthName);
}

function updateEndoscopiesChart(viewMode) {
    const filteredData = filterData();
    updateChartGeneric(
        { ...endoscopiesChartConfig, getData: () => filteredData.filteredEndoscopies },
        viewMode,
        hospitalFilter,
        monthFilter,
        allData,
        currentMonthName
    );
}

function updateSpecialtyChart(specialtyId, viewMode) {
    const specialty = specialties.find(s => s.id === specialtyId);
    if (!specialty) return;
    
    const config = createSpecialtyChartConfig(specialtyId, specialty);
    updateChartGeneric(config, viewMode, hospitalFilter, monthFilter, allData, currentMonthName);
}
