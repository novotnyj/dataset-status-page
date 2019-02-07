/* eslint-disable no-underscore-dangle */
window._statusPage = window._statusPage || {};

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

async function fetchColors() {
    const response = await fetch('/actor-colors.json');
    return response.json();
}

window.getActorColor = (actorName) => {
    if (!window._statusPage.actorColors) {
        fetchColors().then((colors) => {
            window._statusPage.actorColors = colors;
        });
    }
    if (window._statusPage.actorColors[actorName]) {
        return window._statusPage.actorColors[actorName];
    }

    return '#34495e';
};

const runsCtx = document.querySelector('#items-in-time');

const runDataToDataset = (values) => {
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
            label: actorName.charAt(0).toUpperCase() + actorName.slice(1),
            fill: false,
            borderColor: window.getActorColor(actorName),
            spanGaps: true,
        };
    }

    return {
        labels,
        datasets: Object.values(datasets),
    };
};

let chart;

const createOrUpdateLines = (datasetData) => {
    const data = runDataToDataset(datasetData);
    const { interval } = window._statusPage;

    if (chart) {
        chart.data = data;
        chart.options.scales.xAxes[0].time.tooltipFormat = interval === 'day' ? 'MM.DD. HH:mm' : 'MM.DD.';
        chart.options.scales.xAxes[0].scaleLabel.labelString = interval === 'day' ? 'Time' : 'Date';
        chart.options.scales.xAxes[0].time.unit = interval === 'day' ? false : 'day';
        chart.update(0);
        return;
    }

    // eslint-disable-next-line
    chart = new Chart(runsCtx, {
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

const donutsContext = document.querySelector('#items-donut');
const showDonuts = donutsContext !== null;

const charts = {
    cleanItemCount: {
        ctx: donutsContext,
        legendCtx: document.querySelector('.items-legend'),
        total: document.querySelector('.items-total'),
    },
};

const updateOrCreateChart = (data, chartName) => {
    const actorNames = [];
    data.forEach((item) => {
        if (!actorNames.includes(item.actorName)) {
            actorNames.push(item.actorName);
        }
    });
    const colors = actorNames.map((name) => window.getActorColor(name));

    const chartData = actorNames.map((name) => {
        const values = data.filter((item) => item.actorName === name)
            .reduce((prev, curr) => {
                return prev + curr.cleanItemCount;
            }, 0);
        return values;
    });

    let total = 0;
    data.forEach((item) => {
        total += item[chartName];
    });

    charts[chartName].total.innerText = `(${total.toLocaleString()} total)`;

    const legendClickCallback = (event) => {
        event = event || window.event;

        let target = event.target || event.srcElement;
        while (target.nodeName !== 'LI') {
            target = target.parentElement;
        }

        const { legendChart } = charts[chartName];
        const index = parseInt(target.getAttribute('data-index'), 10);
        const meta = legendChart.getDatasetMeta(0);
        const item = meta.data[index];

        if (item.hidden === null || item.hidden === false) {
            item.hidden = true;
            target.classList.add('crossed-text');
        } else {
            target.classList.remove('crossed-text');
            item.hidden = null;
        }
        legendChart.update();
    };

    const setLegend = (chrt) => {
        const container = charts[chartName].legendCtx;
        container.innerHTML = chrt.generateLegend();

        const items = Array.from(container.querySelectorAll('li'));
        items.forEach((item) => {
            item.addEventListener('click', legendClickCallback, false);
        });
    };

    if (charts[chartName].chart) {
        // Update chart
        charts[chartName].chart.data = {
            datasets: [{
                data: chartData,
                backgroundColor: colors,
            }],
            labels: actorNames.map((name) => name.charAt(0).toUpperCase() + name.slice(1)),
        };
        charts[chartName].chart.update(0);
        setLegend(charts[chartName].chart);
        return;
    }

    // eslint-disable-next-line
    const donut = new Chart(charts[chartName].ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: chartData,
                backgroundColor: colors,
            }],
            labels: actorNames.map((name) => name.charAt(0).toUpperCase() + name.slice(1)),
        },
        options: {
            tooltips: {
                callbacks: {
                    label: (tooltipItem, dt) => {
                        let label = dt.labels[tooltipItem.index] || '';
                        if (label) {
                            label += ': ';
                        }

                        label += dt.datasets[0].data[tooltipItem.index].toLocaleString();
                        return label;
                    },
                },
            },
            legend: false,
            legendCallback: (chrt) => {
                const text = [];
                const ds = chrt.data.datasets[0];
                let dt = [];
                for (let i = 0; i < ds.data.length; i++) {
                    dt.push({
                        name: chrt.data.labels[i],
                        value: ds.data[i],
                        index: i,
                    });
                }
                function compare(a, b) {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                }
                dt = dt.sort(compare);
                for (const item of dt) {
                    text.push(`<li class="list-group-item d-flex justify-content-between align-items-center" data-index="${item.index}">`);
                    text.push(`${item.name} <span class="badge badge-default badge-pill">${item.value.toLocaleString()}</span>`);
                    text.push('</li>');
                }
                return text.join('');
            },
        },
    });
    charts[chartName].chart = donut;
    setLegend(donut);
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

const updateData = async () => {
    window._statusPage.actorColors = await fetchColors();

    const url = `/dataset-info.json?interval=${window._statusPage.interval}`;
    const response = await fetch(url);

    const data = await response.json();
    const alerts = Array.from(document.querySelectorAll('.no-data-alert'));
    if (data.length === 0) {
        alerts.forEach((el) => { el.style.display = 'block'; });
    } else {
        alerts.forEach((el) => { el.style.display = 'none'; });
    }

    createOrUpdateLines(data);
    if (showDonuts) {
        for (const chartName of Object.keys(charts)) {
            updateOrCreateChart(data, chartName);
        }
    }
};

window._statusPage.updateData = updateData;

setInterval(updateData, 5 * 60 * 1000);

function loadData() {
    updateData().then(() => {
        console.log('Data loaded');
    });
}

loadIntervals()
    .then(() => {
        loadData();
    });
