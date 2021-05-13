//const AsyncEventEmitter = require("asynchronous-emitter");
const Path = require('path');

function wrapPromise(target, eventName, promise) {
  return (source) => {
    if (!source || (!this.gsm.__options.verbose.promises_delayed && !this.gsm.__options.verbose.promises)) {
      return promise; // No status updates
    }

    // Status funct
    const startedMs = Date.now();
    function statusFunct() {
      const header = `${"  ".repeat(target.__id.split(Path.sep).length - 1)}${source.__id}`;

      function awaitPrint() {
        console.log(`${header}: Awaiting '${target.__id + ".promises." + eventName}()'`);
      }

      // Remind every 10 seconds
      awaitPrint();
      const interval = setInterval(() => {
        if (this.gsm.__hasErrored) {
          // Rather than resolve the promise, we want to halt it and hide the waiting messages (might be able to remove now)
          clearInterval(interval);
          return;
        }

        awaitPrint();
      }, 10000);

      // Notify when finished
      promise.then(() => {
        clearInterval(interval);
        console.log(`${header}: Resolved '${target.__id + ".promises." + eventName}()' ${Date.now() - startedMs}ms`);
      });
    }

    // Print
    if (this.gsm.__options.verbose.promises) {
      // Display when verbose
      statusFunct();
    } else {
      // Display only when delayed
      const timeout = setTimeout(statusFunct, 1);
      promise.then(() => clearTimeout(timeout));
    }
    
    return promise;
  };
}

class Module {
  constructor(filename) {
    console.assert(filename !== undefined);

    this.__id = Module.findId(filename);

    this.__hasInit = false;
    this.__resolves = {};
    this.__rejects = {};
    this.__locks = 0;
    this.__lockEnableResolve = false;
    this.promises = {};

    ["init", "free", "ready", "lock"].forEach(
      (eventName) => this.promises[eventName] = wrapPromise(this, eventName, new Promise((resolve, reject) => { this.__resolves[eventName] = resolve; this.__rejects[eventName] = reject; }))
    );

    const oldLock = this.promises.lock;
    this.promises.lock = (source) => {
      this.__lockEnableResolve = true; // Allow unlock() to resolve lock
      this.__locks == 0 && this.__resolves.lock(); // Resolve if no locks

      return oldLock(source);
    };
  }

  static create(...args) {
    const instance = new this(...args);
    return instance;
  }

  static findId(filename) {
    let id = filename.substring(Path.join('src', Path.dirname(require.main.filename)).length + 1);
    id = id.substring(0, id.length - Path.extname(id).length); // Strip extension
    return (id.endsWith("index"))? id.split(Path.sep)[0]: id;
  }

  async __init(...args) {
    try {
      this.promises.init(this);
      this.init && await this.init(...args);
      this.__hasInit = true; // Flags potential state changes after init

      this.__resolves.init();
      this.gsm.__options.verbose.events && this.log("init");
    } catch(error) {
      this.gsm.__options.verbose.events && this.log("init error");
      this.gsm.error(error);
      this.__rejects.init();
    }
  }

  async __free(...args) {
    try {
      if (this.__hasInit) {
        this.promises.free(this);
        this.free && await this.free(...args);

        this.__resolves.free();
        this.gsm.__options.verbose.events && this.log("free");
      } else {
        this.gsm.__options.verbose.events && this.log("free skipped");
      }
    } catch(error) {
      this.gsm.__options.verbose.events && this.log("free error");
      this.gsm.error(error);
    } finally {
      this.__rejects.free();
    }
  }

  async __ready(...args) {
    try {
      if (this.__hasInit) {
        this.ready && await this.ready(...args);

        this.__resolves.ready();
        this.gsm.__options.verbose.events && this.log("ready");
      } else {
        this.gsm.__options.verbose.events && this.log("ready skipped");
      }
    } catch(error) {
      this.gsm.__options.verbose.events && this.log("ready error");
      this.gsm.error(error);
    } finally {
      this.__rejects.ready();
    }
  }

  get gsm() {
    return Module.gsm;
  }

  lock() {
    if (this.__lockEnableResolve) {
      return false;
    }

    this.__locks++;

    return true;
  }

  unlock() {
    if (--this.__locks == 0) {
      if (this.__lockEnableResolve) {
        this.__resolves.lock();
      }
    } else if (this.__locks < 0) {
      throw new Error(`Unexpected unlock.`);
    }
  }

  setInterval(funct, intervalMs) {
    const interval = setInterval(async () => {
      if (this.gsm.isFreeing()) { // If not cleared after unlock
        clearInterval(interval);
        return;
      }

      try {
        this.lock();
        await funct();
      }
      catch(error) {
        this.gsm.error(error);
      }
      finally {
        this.unlock();
      }
    }, intervalMs);

    return interval;
  }

  setTimeout(funct, delayMs) {
    return setTimeout(async () => {
      try {
        this.lock();
        await funct();
      }
      catch(error) {
        this.gsm.error(error);
      }
      finally {
        this.unlock();
      }
    }, delayMs);
  }

  log(...args) {
    console.log(this.__id + ":", ...args);
  }
}

module.exports = Module;
