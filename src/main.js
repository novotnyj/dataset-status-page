const Apify = require('apify');
const { serve } = require('./serve');
const { storeData } = require('./storeData');
const { ACTIONS } = require('./consts');

Apify.getValue('INPUT')
    .then((input) => {
        let { task } = input;
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
                if (task === ACTIONS.STORE) {
                    await storeData();
                }

                console.log('Done.');
            });
        }
    });
