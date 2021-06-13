const Module = require('graceful-shutdown-manager').Module;
const fs = require("fs");
const Path = require("path");

//
class Log {
  constructor(config, type) {
    this.__config = config;
    this.__type = type;
    this.__content = "";
    this.__filename = this.__config.filename || Path.join("logs", `${this.__type}.log`);

    const dirname = Path.dirname(this.__filename);
    if (dirname != "." && !fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
  }

  save() {
    if (this.__content) {
      fs.appendFileSync(this.__filename, this.__content);
      this.__content = "";
    }
  }

  append(...data) {
    this.__content += data.join(" ") + "\n";
  }
}

//
class Logs extends Module {
  constructor(config) {
    super(__filename);

    // Sanity check
    if (!config || !config.error || !config.info || !config.log) {
      throw new Error("Logs: Config invalid");
    }

    this.config = config;

    // Generate log objects
    this.logs = ["log", "error", "info"].reduce((obj, type) => {
      obj[type] = new Log(config[type], type);
      return obj;
    }, {});

    const oldConsoleLog = console.log;
    console.log = (...args) => {
      config.log.enable && this.logs.log.append(`${(new Date()).toLocaleString()}:`, ...args);
      oldConsoleLog.apply(console, args);
    };

    let errorCount = 0;
    console.error = (error) => {
      errorCount++;
      config.error.enable && this.logs.error.append(`${(new Date()).toLocaleString()} #${errorCount}:\n${error.stack? error.stack: error}\n`);
      console.log(`Error #${errorCount}:`);
      console.log(error);
    };
    
    console.info = (...args) => {
      config.info.enable && this.logs.info.append(`${(new Date()).toLocaleString()}:`, ...args);
      console.log(...args);
    };
  }

  async init() {

  }

  async free() {
    this.save();
  }

  async ready() {
    for(const [type, log] of Object.entries(this.logs)) {
      if (!this.config[type].enable) {
        continue;
      }

      this.setInterval(() => {
        log.save();
      }, Module.gsm.dhms(this.config[type].interval));
    }
  }

  save() {
    for(const log of Object.values(this.logs)) {
      log.save();
    }
  }
}

module.exports = Logs;