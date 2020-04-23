const moment = require('moment');
const md5 = require('md5');
const { INTERVALS, STORAGE_NAME } = require('./consts');

function intervalToMoments(interval) {
    if (interval === INTERVALS.DAY) {
        return {
            name: interval,
            start: moment().subtract(24, 'hour'),
            end: moment(),
        };
    }

    const midnight = moment().hour(0).minute(0).second(1);
    if (interval === INTERVALS.WEEK) {
        return {
            name: interval,
            start: midnight.subtract(7, 'day'),
            end: moment(),
        };
    }
    if (interval === INTERVALS.TWO_WEEKS) {
        return {
            name: interval,
            start: midnight.subtract(14, 'day'),
            end: moment(),
        };
    }
    if (interval === INTERVALS.MONTH) {
        return {
            name: interval,
            start: midnight.subtract(30, 'day'),
            end: moment(),
        };
    }
    if (interval === INTERVALS.TWO_MONTHS) {
        return {
            name: interval,
            start: midnight.subtract(60, 'day'),
            end: moment(),
        };
    }

    throw new Error(`Interval has to be one of ${Object.values(INTERVALS).join(', ')}. Got "${interval}".`);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeName(name) {
    return name.toLowerCase().replace(/[\s{}"?><;=+]/g, '-');
}

function getChartId(chartName) {
    if (!chartName) return 'default';
    return normalizeName(chartName);
}

function getChartStorageName(chartName) {
    if (chartName === 'default') return STORAGE_NAME;
    const normalizedName = normalizeName(chartName);
    const result = `${normalizedName}-${STORAGE_NAME}`;
    if (result.length >= 63) {
        const nameHash = md5(normalizedName);
        const remainingLength = 63 - `-${STORAGE_NAME}`.length;
        return nameHash.length > remainingLength
            ? `${nameHash.substr(0, remainingLength-1)}-${STORAGE_NAME}`
            : `${nameHash}-${STORAGE_NAME}`;
    }

    return result;
}

module.exports = { intervalToMoments, getRandomInt, normalizeName, getChartStorageName, getChartId };
