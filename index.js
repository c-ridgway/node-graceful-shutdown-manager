const Manager = require("./src/Manager");
const Module = require("./src/Module");
const Loader = require("./src/Loader");

module.exports = {
  Module,
  Loader,
  create(...args) {
    const manager = Manager.create(...args);
    Module.gsm = manager;
    return manager;
  }
};
