const Apify = require('apify');
const { serve } = require('./serve');
const { storeData } = require('./storeData');
const { ACTIONS } = require('./consts');

const { client } = Apify;
const { acts } = client;

async function getActor(actId) {
    return acts.getAct({ actId });
}

Apify.getValue('INPUT')
    .then((input) => {
        let { task, charts, rebrandly, intervals } = input;
        const { eventType, resource } = input;
        if (eventType && eventType === 'ACTOR.RUN.SUCCEEDED') {
            task = ACTIONS.STORE;
        }

        if (!task && (charts || rebrandly || intervals)) {
            task = ACTIONS.SERVE;
        }

        if (!task) {
            task = ACTIONS.STORE;
        }

        if (!Object.values(ACTIONS).some((action) => action === task)) {
            throw new Error(`Task has to be one of: ${Object.values(ACTIONS).join(', ')}, ${task} given`);
        }
        if (task === ACTIONS.SERVE) {
            serve(input)
                .then(() => console.log('Done'))
                .catch((e) => { throw e; });
        } else {
            Apify.main(async () => {
                if (resource) {
                    const { actId, defaultDatasetId } = resource;
                    const actor = await getActor(actId);
                    input.name = input.name || input.siteName || actor.name;
                    input.datasetId = defaultDatasetId;
                }

                if (task === ACTIONS.STORE) {
                    await storeData(input);
                }

                console.log('Done.');
            });
        }
    });
