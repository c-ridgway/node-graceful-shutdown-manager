const Loader = require("graceful-shutdown-manager").Loader;
const mysql = require("mariadb");
const fs = require("fs");

class Database extends Loader {
  constructor(config) {
    super(__filename, __dirname, "Database");

    // Sanity check
    if (!config || ((!config.host || !config.port) && !config.socketPath && !config.socket) || (!config.user && !config.username) || (!config.pass && !config.password) || !config.database) {
      throw new Error("Database: Config invalid");
    }

    config.user = config.user || config.username; // Handle MariaDB connector naming inconsistencies
    config.socketPath = config.socketPath || config.socket;
    config.connectionLimit = config.connectionLimit || config.connections;

    if (config.socketPath && !fs.existsSync(config.socketPath)) {
      config.socketPath = "";
      console.log(`This socket path does not exist, falling back to '${config.host}:${config.port}'`);
    }

    this.config = config;
  }

  async init() {
    await this.connect();
  }

  async free() {
    await this.close();
  }

  async ready() {

  }

  get connection() {
    return this._pool.getConnection();
    //return this._connection;
  }

  async connect() {
    const uri = this.config.socketPath || `${this.config.host}:${this.config.port}`;

    //this._connection = await mysql.createConnection(this.config);
    this._pool = mysql.createPool(this.config);
    const started = Date.now();
    const connection = await this._pool.getConnection();
    this.log(`Connected '${uri}' (${connection.threadId}) ${Date.now() - started}ms`);
    connection.release();
  }

  async close() {
    await this._pool.end();
  }
}

module.exports = Database;
