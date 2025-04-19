function loadDeviceConfig(oximeter) {
  const configPath = oximeter == 1
    ? './OximeterDeviceConfig.json'
    : './ThermometerDeviceConfig.json';
  return require(configPath);
}

module.exports = {
  loadDeviceConfig,
};