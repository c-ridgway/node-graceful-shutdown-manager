/*
  GSM Functions:
    gsm.exit() Gracefully shutdown application by running free and then terminating the process.
    gsm.free() Gracefully run free events, without exiting. (autoreload code, etc)
    gsm.isExiting() Use when in a loop/long task, to avoid continuing
    gsm.isFreeing() Same as above, but also called during exiting

  Module Functions:
    base.lock() Wait to free the object until it's unlocked again
    base.unlock()
    base.setInterval() // Works like setInterval, except it locks the entire scope and unlocks in finally
    base.setTimeout() // Same as above. The app will only lock if it's in the middle of executing.

  npm run development
  npm run production
*/

function main(production, gsm) {
  const config = require("../config.json");

  global.gsm = gsm;
  global.logs = require("./Logs").create(config.logs);
  global.database = require("./Database").create(config.database);
  global.router = require("./Router").create(config.router);
  global.app = require("./App").create();

  // Start
  gsm.init({
    modules: [logs, database, router, app], // Load modules in this order '.init()' '.ready()' and upon freeing/exiting '.free()'
    async error(error) {
      return production; // Autorestart on error, has graceful exiting nodemon alternative built in (different to code change autoreload)
    },
    free(error) {
      // Called when program has successfully freed, a uncaught runtime error which triggered termination may be present
    },
    debug: config.gsm.debug, // Sanity checks (such as access an uninitialized dependency)
    verbose: config.gsm.verbose // Output more to the log (useful for knowing what's going on)
  });
}

module.exports = main;