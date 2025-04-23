const fs = require('fs');
const path = require('path');

function loadDeviceById(id) {
  const filePath = path.join(__dirname, 'devices_no_pairing.json');
  const devices = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  return devices.find((device) => device.id === id) || null;
}

function loadPairableDeviceById(id) {
  const filePath = path.join(__dirname, 'pairable_ble_devices.json');
  const devices = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  return devices.find((device) => device.id === id) || null;
}


module.exports = {
    loadDeviceById,
    loadPairableDeviceById
};