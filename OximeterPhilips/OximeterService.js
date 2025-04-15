var bleno = require('@abandonware/bleno');
var PrimaryService = bleno.PrimaryService;

function createPrimaryService(uuid, characteristics) {
    return new PrimaryService({ uuid, characteristics });
}

module.exports = {
    createPrimaryService,
};