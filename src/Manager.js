const Module = require("./Module");
const Loader = require("./Loader");
const fs = require("fs");
const Path = require("path");

//
class GSM {
  constructor(reload) {
    this.__id = "GSM";
    this.__isFreeing = false;
    this.__isExiting = false;
    this.__isRestarting = false;
    this.__hasReadied = false; // Blocks autoreload if false, until a file change
    this.__hasErrored = false;
    this.__exitError = null;
    this.__options = { modules: [] };
    this.__canAutoreload = false;
  }

  static create(chokidar) {
    const instance = new this();

    let attempt = 0;
    process.on("SIGTERM", (code) => instance.exit(false, code));
    process.on("SIGINT", (code) => {
      if (attempt++ > 0) {
        console.log(`Force Exit (${attempt}/5)`);
      }

      instance.exit(attempt == 5);
    });

    // Autoreload
    if (chokidar) {
      instance.__enableAutoreload(...chokidar);
    }

    return instance;
  }

  async init(options) {
    console.log();
    console.log("GSM: Starting", this.__isNode() ? `(${process.pid})` : null);

    this.__options = options;
    this.__options.verbose = this.__options.verbose || {};

    // Uncaught error
    process.on("unhandledRejection", (reason, p) => this.error(reason)).on("uncaughtException", (error) => this.error(error));
    //process.on("uncaughtException", (reason, p) => this.error(reason));

    let hasReadied = true;

    // Init
    const modules = this.__options.modules;

    const modulePaths = [];
    let promises = [];
    modules.forEach((module) => {
      module instanceof Loader && modulePaths.push(module.__modulePath);
      promises.push(module.__init());
    });
    await Promise.allSettled(promises);

    //if (!Module.gsm.isFreeing()) {
    // Ready
    promises = [];
    modules.forEach((module) => {
      if (module instanceof Loader) {
        const modulePathsProcessed = [module.__modulePath, ...modulePaths.filter((path) => path != module.__modulePath).map((path) => Path.join(path, module.__name))];
        promises.push(module.__ready(modulePathsProcessed));
      } else {
        promises.push(module.__ready());
      }
    });
    await Promise.allSettled(promises);
    //}

    !this.__hasErrored ? console.log("GSM: Started") : console.log("GSM: Started Unsuccessfully");
  }

  async free() {
    try {
      if (this.isFreeing()) return;
      this.__isFreeing = true;

      if (!this.isExiting() && !this.isRestarting()) {
        console.log("GSM: Freeing");
      }

      const modules = this.__options.modules.reverse().filter((module) => module.__hasInit); // Filter out unintialised

      // Wait for ready to finish (and start status updates)
      let promises = [];
      modules.forEach((module) => promises.push(module.promises.ready(this)));
      await Promise.all(promises);

      // Clear all before free
      /*for(const module of modules) {
        module.promises.clear(this); // Notify
        module._clear();
      }*/

      // Start resolving when unlocked
      for (const module of modules) {
        module.__lockEnableResolve = true;
      }

      // Free all
      for (const module of modules) {
        await module.promises.lock(this);

        //await module.promises.clear(null); // Ensure timers are cleared
        module.promises.free(this); // Wait for ready to finish (and start status updates)

        try {
          await module.__free();
        } catch (error) {
          // Errors pertaining to backend waiting
        }
      }

      this.__options.free && (await this.__options.free(this.__exitError));
    } catch (error) {
      Module.gsm.error(error);
    }

    // Wait for code changes, if errored during init/ready
    if (this.__hasErrored && this.__canAutoreload) {
      const promise = new Promise((resolve, reject) => {
        this._autoreloadWaitResolve = resolve;
      });

      console.log("Waiting for code changes...");
      await promise;
    }
  }

  async exit(force, code) {
    if (force) process.exit(0);
    if (this.isExiting()) return;
    this.__isExiting = true;

    if (!this.isFreeing() && !this.isRestarting()) {
      console.log("GSM: Exiting", this.__isNode() ? `(${process.pid})` : null);
    }

    await this.free();
    //await this.__sleep(2000);

    process.exit(0);
  }

  async restart(force, code) {
    if (this.isRestarting()) return;
    this.__isRestarting = true;

    if (!this.isFreeing()) {
      console.log("GSM: Restarting", this.__isNode() ? `(${process.pid})` : null);
    }

    fs.openSync(".restart", "w");
    await this.exit(force, code);
  }

  isFreeing() {
    return this.__isFreeing;
  }

  isExiting() {
    return this.__isExiting;
  }

  isRestarting() {
    return this.__isRestarting;
  }

  isDebug() {
    return this.__options.debug;
  }

  __enableAutoreload(...args) {
    const chokidar = require("chokidar");

    chokidar
      .watch(...args)
      .on("error", () => {})
      .on("change", (event, at) => {
        this._autoreloadWaitResolve && this._autoreloadWaitResolve();

        this.restart();
      });

    this.__canAutoreload = true;
  }

  __isNode() {
    return typeof window === "undefined";
  }

  dhms(str, inSeconds) {
    // https://github.com/astur/dhms/blob/master/LICENSE
    const x = inSeconds ? 1 : 1000;
    if (typeof str !== "string") return 0;
    const fixed = str.replace(/\s/g, "");
    const tail = +fixed.match(/-?\d+$/g) || 0;
    const parts = (fixed.match(/-?\d+[^-0-9]+/g) || []).map((v) => +v.replace(/[^-0-9]+/g, "") * ({ s: x, m: 60 * x, h: 3600 * x, d: 86400 * x }[v.replace(/[-0-9]+/g, "")] || 0));
    return [tail, ...parts].reduce((a, b) => a + b, 0);
  }

  error(error) {
    if (!error) {
      return; // A manual resolve which shouldn't be printing (such as a module awaiting another upon an error)
    }

    console.error(error);

    try {
      const restart = (this.__options.error && this.__options.error(error));
      if (this.__hasErrored) return;
      this.__hasErrored = true;
      this.__exitError = error;

      if (restart) {
        this.restart();
      } else {
        this.exit();
      }
    } catch (error) {
      console.error(error);
    }
  }

  __sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = GSM;
