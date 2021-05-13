const Loader = require("graceful-shutdown-manager").Loader;

class App extends Loader {
  constructor(config) {
    super(__filename, __dirname, "App");

    this.config = config;
  }

  async init() {
  }

  async free() {
  }

  async ready() {
    this.log(`Current time '${this.getTimeString()}'`);

    //await database.insertExample({age: 21, name: "test"});
    //const rows = await database.selectExample();
    //console.log(rows);
  }

  getTimeString() {
    const datetime = new Date();
    return datetime.toISOString().substring(11).slice(0, 8); // Take time part of full date/time string
  }
}

module.exports = App;
