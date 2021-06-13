/*

*/

module.exports = {
  async init() {
    await database.modules.exportObject.promises.init(this);
    await this.sleep(2000);
  },
  async free() {
  },
  async ready() {
    //this.setInterval(() => {}, 1000); // Wraps locks around content body for timers
    //this.setTimeout(() => {}, 1000);
    //
    //await this.lock();
    // Do something important
    //await this.lock();
  },
  exports() {
    this.log('exportObjectFunct');
  }
};
