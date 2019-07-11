const Apify = require('apify');
const moment = require('moment');
const { COLORS_KEY, INTERVALS } = require('./consts');
const { getChartStorageName } = require('./utils');

const cache = {};

async function cacheCleaner() {
    const keys = Object.keys(cache);
    const now = Date.now();
    const maxAge = 15 * 60 * 1000;
    for (const key of keys) {
        const { cachedAt } = cache[key];
        if (now - cachedAt >= maxAge) {
            console.log(`Removing ${key} from cache`);
            delete cache[key];
        }
    }
}

setInterval(cacheCleaner, 1 * 60 * 1000);

function groupDays(data) {
    const result = {};
    data.forEach((item) => {
        const createdAt = moment(item.createdAt).format('YYYY-MM-DD');
        if (result[createdAt] !== undefined) {
            result[createdAt].itemCount += item.itemCount;
            result[createdAt].cleanItemCount += item.cleanItemCount;
        } else {
            result[createdAt] = { ...item };
            result[createdAt].createdAt = moment(item.createdAt).hour(12).minute(0).toISOString();
        }
    });

    return Object.values(result);
}

async function getActorData(store, actorName, interval, chartId) {
    const { start, end } = interval;

    let data;
    if (!cache[chartId]) {
        cache[chartId] = {};
    }
    const actorCache = cache[chartId][actorName] || {};
    if (actorCache[actorName] && actorCache[actorName] !== null) {
        // eslint-disable-next-line prefer-destructuring
        data = actorCache[actorName].data;
    }

    if (!data || data.length === 0) {
        data = await store.getValue(actorName);
        data = data.sort((a, b) => {
            const d1 = moment(a.createdAt);
            const d2 = moment(b.createdAt);
            if (d1.isSame(d2)) return 0;
            return d1.isBefore(d2) ? -1 : 1;
        });
        cache[chartId][actorName] = { cachedAt: Date.now(), data };
    }

    if (!data) {
        return [];
    }

    data = data.filter((item) => {
        const createdAtMoment = moment(item.createdAt);
        if (createdAtMoment.isBefore(start)) {
            return false;
        }
        if (createdAtMoment.isAfter(end)) {
            return false;
        }
        return true;
    });

    if (interval.name !== INTERVALS.DAY) {
        data = groupDays(data);
    }

    return data;
}

async function getColors(chartId) {
    const chartStore = getChartStorageName(chartId);
    const store = await Apify.openKeyValueStore(chartStore);
    return store.getValue(COLORS_KEY);
}

async function getStoreKeys(store) {
    const result = [];

    await store.forEachKey(async (key) => {
        if (typeof key === 'string' || key instanceof String) {
            result.push(key);
        } else {
            result.push(key.key);
        }
    });

    return result.filter((key) => key !== COLORS_KEY);
}

async function getData(interval, chartId) {
    const chartStore = getChartStorageName(chartId);
    const store = await Apify.openKeyValueStore(chartStore);
    const keys = await getStoreKeys(store);

    let promises = [];
    let result = [];
    for (const actorName of keys) {
        promises.push(getActorData(store, actorName, interval, chartId));
        if (promises.length > 10) {
            const results = await Promise.all(promises);
            promises = [];
            result = result.concat(...results);
        }
    }

    if (promises.length > 0) {
        const results = await Promise.all(promises);
        result = result.concat(...results);
    }

    return result;
}

module.exports = { getData, getColors };
