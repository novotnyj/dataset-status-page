const Apify = require('apify');
const moment = require('moment');
const { STORAGE_NAME, COLORS_KEY, INTERVALS } = require('./consts');

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
        if (result[createdAt]) {
            result[createdAt].itemCount += item.itemCount;
            result[createdAt].cleanItemCount += item.cleanItemCount;
        } else {
            result[createdAt] = { ...item };
            result[createdAt].createdAt = moment(item.createdAt).hour(12).minute(0).toISOString();
        }
    });

    return Object.values(result);
}

async function getActorData(store, actorName, interval) {
    const { start, end } = interval;

    let data;
    if (cache[actorName] && cache[actorName] !== null) {
        // eslint-disable-next-line prefer-destructuring
        data = cache[actorName].data;
    }

    if (!data || data.length === 0) {
        data = await store.getValue(actorName);
        data = data.sort((a, b) => {
            const d1 = moment(a.createdAt);
            const d2 = moment(b.createdAt);
            if (d1.isSame(d2)) return 0;
            return d1.isBefore(d2) ? -1 : 1;
        });
        cache[actorName] = { cachedAt: Date.now(), data };
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

async function getColors() {
    const store = await Apify.openKeyValueStore(STORAGE_NAME);
    return store.getValue(COLORS_KEY);
}

async function forEachKey(storeId, iteratee, options = {}, index = 0) {
    const { exclusiveStartKey } = options;

    const response = await Apify.client.keyValueStores.listKeys({
        storeId,
        exclusiveStartKey,
    });
    const { nextExclusiveStartKey, isTruncated, items } = response;

    for (const key of items) {
        await iteratee(key, index++);
    }

    return isTruncated ? forEachKey(storeId, iteratee, {
        exclusiveStartKey: nextExclusiveStartKey,
    }, index) : undefined; // [].forEach() returns undefined.
}

async function getStoreKeys(store) {
    const result = [];
    if (!Apify.isAtHome()) {
        await store.forEachKey(async (key) => {
            result.push(key);
        });

        return result.filter((key) => key !== COLORS_KEY);
    }

    await forEachKey(store.storeId, async (key) => {
        result.push(key.key);
    });

    return result.filter((key) => key !== COLORS_KEY);
}

async function getData(interval) {
    const store = await Apify.openKeyValueStore(STORAGE_NAME);
    const keys = await getStoreKeys(store);

    const promises = [];
    let result = [];
    for (const key of keys) {
        promises.push(getActorData(store, key, interval));
        if (promises.length > 10) {
            const results = await Promise.all(promises);
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
