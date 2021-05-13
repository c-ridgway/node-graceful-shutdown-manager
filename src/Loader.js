const Module = require("./Module");
const { readdir } = require("fs/promises");
const fs = require("fs");
const Path = require("path");

class Loader extends Module {
  constructor(id, path, name) {
    super(id);

    this.__path = path;
    this.__name = name;
    this.__modulePath = this.__path; //Path.join(this.__path, this.__name);
    this.modules = Object.create(null);
  }

  async __init(...args) {
    await super.__init(...args);
  }

  async __free(...args) {
    if (this.__hasInit) {
      await this.__freeModules();
    }

    await super.__free(...args);
  }

  async __ready(modulePaths) {
    let promises = [];

    if (this.__hasInit) {
      const promises = [];
      for (const modulePath of modulePaths) {
        promises.push(this.__loadModules(modulePath));
      }

      try {
        await Promise.all(promises);
      } catch(error) {
        this.gsm.error(error);
      }

      try {
        await this.__initModules();
      } catch(error) {
        this.gsm.error(error);
      }

      promises.push(this.__readyModules());
    }

    promises.push(super.__ready());
    await Promise.allSettled(promises);
  }

  // Load modules
  async __loadModules(path) {
    if (!fs.existsSync(path)) return;

    const promises = [];
    const files = await getFiles(path, ["index.js"]);
    for (const filename of files) {
      if (![".js", ".mjs", ".ts"].includes(Path.extname(filename))) continue;

      //Path.relative(Path.dirname(require.main.filename), filename)
      promises.push(this.__loadModule(filename, require(filename))); //"." + Path.sep +
    }

    await Promise.all(promises);
  }

  async __loadModule(filename, data) {
    const moduleName = Path.basename(filename, Path.extname(filename));

    if (typeof data == "function") {
      const id = Module.findId(filename);

      this.__define(moduleName, null, moduleName, data);
    } else {
      const module = Object.assign(new Module(filename), data);

      if (module.exports === null) {
        // Object
        this.__define(moduleName, module, moduleName, module);
      } else if (typeof module.exports == "function") {
        // Function
        this.__define(moduleName, module, moduleName, (...args) => module.exports(...args));
      } else if (Array.isArray(module.exports)) {
        // Array members
        module.exports.forEach((field) => {
          this.__define(moduleName, module, field, (...args) => module[field](...args));
        });
      } /*
      // Error will need to display source function instead
      else {
        // Map members
        for(const [field, fieldTo] of Object.entries(module.exports)) {
          this.__define(module, field, (...args) => module[fieldTo](...args))
        }
      }*/

      this.modules[moduleName] = module;
    }
  }

  __define(moduleName, module, field, value) {
    if (field in this) {
      throw new Error(`${this.__id}: Already has field '${field}'`);
    }

    if (!Module.gsm.isDebug()) {
      this[field] = value;
    } else {
      const fieldParams = `${field}${typeof value == "function" ? "()" : ""}`;

      // Verify object has been initialised upon accessing
      Object.defineProperty(this, field, {
        get: () => {
          if (module && !module.__hasInit) {
            //console.log(arguments.callee.caller.name);
            const error = new Error();
            const stack = error.stack.split(/\r?\n/);
            let stackLine = "Unknown";

            for (const line of stack) {
              if (line.includes(Path.sep + this.__id + Path.sep)) {
                stackLine = line.split(Path.sep).slice(-2).join(Path.sep).slice(0, -1);
                break;
              }
            }

            function uncapitalize(str) {
              return str.charAt(0).toLowerCase() + str.slice(1);
            }

            const highlight = "\x1b[4m";
            const reset = "\x1b[0m";
            throw new Error(`Module '${highlight}${stackLine}${reset}' accessing uninitialized module '${module.__id}'\nSolution: ${highlight}await ${uncapitalize(this.__id)}.modules.${moduleName}.promises.init();${reset}\nBacktrace:`);
          }

          return value;
        },
      });

      if (this.gsm.__options.verbose.defines) {
        console.log(`  Defined: '${this.__id}.${fieldParams}'`);

        /*if (module) {
          module.log(`Defined '${this.__id}.${fieldParams}'`);
        } else {
          console.log(`  ${this.__id}${Path.sep}${moduleName}: Defined '${this.__id}.${fieldParams}'`);
        }*/
      }
    }
  }

  async __initModules() {
    const modules = Object.values(this.modules);

    const promises = [];
    modules.forEach((module) => promises.push(module.__init()));
    await Promise.allSettled(promises);
  }

  async __readyModules() {
    const modules = Object.values(this.modules);

    const promises = [];
    modules.forEach((module) => promises.push(module.__ready()));

    await Promise.allSettled(promises);
  }

  async __freeModules() {
    const modules = Object.values(this.modules).reverse(); //.filter(module => module.__hasInit)

    const promises = [];
    modules.forEach((module) => promises.push(module.promises.ready(this)));
    await Promise.all(promises);

    // Start resolving when unlocked
    modules.forEach((module) => (module.__lockEnableResolve = true));

    // Free all
    for (const module of modules) {
      await module.promises.lock(this);

      //await module.promises.clear(null); // Ensure timers are cleared
      module.promises.free(this); // Wait for ready to finish (and start status updates)
      await module.__free();
    }
  }
}

//
async function getFiles(dir, exclude) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents
      .filter((dirent) => !dirent.isDirectory() && !exclude?.includes(dirent.name))
      .map((dirent) => {
        return Path.resolve(dir, dirent.name);
        //const res = Path.resolve(dir, dirent.name);
        //return dirent.isDirectory() ? getFiles(res) : res;
      })
  );
  return Array.prototype.concat(...files);
}

module.exports = Loader;
