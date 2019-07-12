/* eslint-disable no-underscore-dangle */
window._statusPage = window._statusPage || { };
window._statusPage.actorColors = window._statusPage.actorColors || {};
window._statusPage.chartList = window._statusPage.chartList || null;

const hash = window.location.hash.split('&').reduce((result, item) => {
    const [name, value] = item.split('=');
    result[name.replace('#', '')] = value;
    return result;
}, {});

window._statusPage.interval = hash.interval || null;

function setActiveClass(interval) {
    const active = document.querySelector('a[data-interval].active');
    active.classList.remove('active');
    const newActive = document.querySelector(`a[data-interval="${interval}"]`);
    newActive.classList.add('active');
}

function intervalChanged(e) {
    const interval = e.srcElement.getAttribute('data-interval');
    window._statusPage.interval = interval;
    const promises = [];
    promises.push(window._statusPage.updateData());

    Promise.all(promises).then(() => {
        console.log('Reloaded');
    });

    setActiveClass(interval);
}

async function fetchColors(chartId) {
    const response = await fetch(`/actor-colors.json?chartId=${chartId}`);
    return response.json();
}

window.getActorColor = (actorName, chartId) => {
    if (!window._statusPage.actorColors[chartId]) {
        fetchColors(chartId).then((colors) => {
            window._statusPage.actorColors[chartId] = colors;
        });
    }
    if (window._statusPage.actorColors[chartId] && window._statusPage.actorColors[chartId][actorName]) {
        return window._statusPage.actorColors[chartId][actorName];
    }

    return '#34495e';
};

const runDataToDataset = (values, chartId) => {
    const labels = [];
    values.forEach((item) => {
        labels.push(Date.parse(item.createdAt));
    });

    const actorNames = [...new Set(values.map((item) => item.actorName))];

    const datasets = {};
    for (const actorName of actorNames) {
        const actorValues = values.filter((item) => item.actorName === actorName);
        datasets[actorName] = {
            data: actorValues.map(((item) => ({ x: Date.parse(item.createdAt), y: item.cleanItemCount }))),
            label: actorName.startsWith('www') ? actorName : actorName.charAt(0).toUpperCase() + actorName.slice(1),
            fill: false,
            borderColor: window.getActorColor(actorName, chartId),
            spanGaps: true,
        };
    }

    return {
        labels,
        datasets: Object.values(datasets),
    };
};

window._statusPage.charts = {};

const createOrUpdateLines = (datasetData, chartId) => {
    const data = runDataToDataset(datasetData, chartId);
    const { interval } = window._statusPage;

    if (window._statusPage.charts[chartId]) {
        const chart = window._statusPage.charts[chartId];
        chart.data = data;
        chart.options.scales.xAxes[0].time.tooltipFormat = interval === 'day' ? 'MM.DD. HH:mm' : 'MM.DD.';
        chart.options.scales.xAxes[0].scaleLabel.labelString = interval === 'day' ? 'Time' : 'Date';
        chart.options.scales.xAxes[0].time.unit = interval === 'day' ? false : 'day';
        chart.update(0);
        return;
    }

    const ctx = document.querySelector(`#${chartId}`);
    // eslint-disable-next-line
    window._statusPage.charts[chartId] = new Chart(ctx, {
        type: 'line',
        data,
        options: {
            tooltips: {
                callbacks: {
                    label: (tooltipItem, dt) => {
                        let label = dt.datasets[tooltipItem.datasetIndex].label || '';
                        if (label) {
                            label += ': ';
                        }

                        label += tooltipItem.yLabel.toLocaleString();
                        return label;
                    },
                },
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        tooltipFormat: interval === 'day' ? 'MM.DD. HH:mm' : 'MM.DD.',
                        unit: interval === 'day' ? false : 'day',
                    },
                    scaleLabel: {
                        display: true,
                        labelString: interval === 'day' ? 'Time' : 'Date',
                    },
                }],
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Item count',
                    },
                    ticks: {
                        callback: (label) => {
                            return label.toLocaleString();
                        },
                    },
                }],
            },
        },
    });
};

async function loadIntervals() {
    const response = await fetch('/intervals.json');
    const data = await response.json();
    const intervals = data.intervals.map((item) => item.value);

    if (!window._statusPage.interval || !intervals.includes(window._statusPage.interval)) {
        window._statusPage.interval = data.default;
    }

    const container = document.querySelector('#intervalsNavBar');
    const selectedInterval = window._statusPage.interval;
    function getItem(interval) {
        const el = document.createElement('a');
        el.setAttribute('class', interval.value === selectedInterval ? 'nav-item nav-link active' : 'nav-item nav-link');
        el.setAttribute('href', `#interval=${interval.value}`);
        el.setAttribute('data-interval', interval.value);
        el.innerHTML = interval.label;
        return el;
    }
    data.intervals.forEach((interval) => {
        const el = getItem(interval);
        container.appendChild(el);
    });

    const links = Array.from(document.querySelectorAll('a[data-interval]'));

    links.forEach((el) => {
        el.addEventListener('click', intervalChanged);
    });
}

const updateData = async (chartId) => {
    window._statusPage.actorColors[chartId] = await fetchColors(chartId);

    const url = `/dataset-info.json?interval=${window._statusPage.interval}&chartId=${chartId}`;
    const response = await fetch(url);

    const data = await response.json();
    const alerts = Array.from(document.querySelectorAll(`.${chartId} .no-data-alert`));
    if (data.length === 0) {
        alerts.forEach((el) => { el.style.display = 'block'; });
    } else {
        alerts.forEach((el) => { el.style.display = 'none'; });
    }

    createOrUpdateLines(data, chartId);
};

const loadCharts = async () => {
    const url = '/charts.json';
    const response = await fetch(url);

    window._statusPage.chartList = Object.values(await response.json());
};

window._statusPage.updateData = updateData;

setInterval(() => {
    window._statusPage.chartList.forEach((chart) => {
        updateData(chart.id).then(() => {
            console.log(`Data loaded for ${chart.name}`);
        });
    });
}, 5 * 60 * 1000);

function loadData() {
    if (!window._statusPage.chartList) {
        loadCharts().then(() => {
            loadData();
        });
        return;
    }

    window._statusPage.chartList.forEach((chart) => {
        updateData(chart.id).then(() => {
            console.log(`Data loaded for ${chart.name}`);
        });
    });
}

loadIntervals()
    .then(() => {
        loadData();
    });
