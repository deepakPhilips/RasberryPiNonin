// Unified PrimaryService helper
const bleno = require('@abandonware/bleno');
const PrimaryService = bleno.PrimaryService;

function createPrimaryService(uuid, characteristics) {
  return new PrimaryService({ uuid, characteristics });
}

module.exports = {
  createPrimaryService,
};