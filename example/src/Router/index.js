const Loader = require("graceful-shutdown-manager").Loader;
const fastify = require("fastify");

class Router extends Loader {
  constructor(config) {
    super(__filename, __dirname, "Router");

    // Sanity check
    if (!config || (!config.http && !config.https) || !config.http || !config.http.bind || !config.http.port || !config.https || !config.https.bind || !config.https.port || !config.https.key || !config.https.cert) {
      throw new Error("Router: Config invalid");
    }

    this.config = config;
    this.servers = {};
  }

  async init() {
    if (this.config.http.enable) {
      this.servers.http = fastify();
      this.servers.http.register(require("fastify-formbody"));
    }

    if (this.config.https.enable) {
      const fs = require("fs").promises;

      this.servers.https = fastify({
        https: {
          http2: true,
          key: await fs.readFile(this.config.https.key),
          cert: await fs.readFile(this.config.https.cert),
        },
      });

      this.servers.https.register(require("fastify-cors"), {});
      this.servers.https.register(require("fastify-formbody"));
    }

    await global.database.promises.init(this);
  }

  async free() {
    await this.close();
  }

  async ready() {
    await this.listen();
  }

  async listen() {

    const promises = [];
    for (const [protocol, server] of Object.entries(this.servers)) {
      const config = this.config[protocol];
      promises.push(
        server.listen(config.port, config.bind).then((address) => {
          this.log(`Listening '${address}`);
          this._address = address;
        })
      );

      server.addHook("onClose", (instance, done) => {
        this.log(`Closed '${this._address}`);
        done();
      });
    }

    await Promise.all(promises);
  }

  async close() {
    for (const [protocol, server] of Object.entries(this.servers)) {
      await server.close();
    }
  }
}

module.exports = Router;
