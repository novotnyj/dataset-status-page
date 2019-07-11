const Apify = require('apify');
const { CHARTS_STORAGE } = require('./consts');
const { getChartId } = require('./utils');

async function saveChart(chartName) {
    const chartsStore = await Apify.openKeyValueStore(CHARTS_STORAGE);
    let charts = await chartsStore.getValue('charts');
    const chartId = getChartId(chartName);
    if (!charts) {
        charts = {};
    }
    if (chartName === 'default' || !chartName) {
        chartName = 'Count of dataset items in time';
    }
    charts[chartId] = { id: chartId, name: chartName };
    await chartsStore.setValue('charts', charts);
}

async function getCharts() {
    const chartsStore = await Apify.openKeyValueStore(CHARTS_STORAGE);
    return chartsStore.getValue('charts');
}

module.exports = { saveChart, getCharts };
