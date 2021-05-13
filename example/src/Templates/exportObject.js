/*

*/

module.exports = {
  async init() {
    await database.modules.exportObjectFunct.promises.init(); // Wait for dependency before calling below function
    database.exportObjectFunct();
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
  field1() {
    this.log(`exportObject.field1`);
  },
  field2() {
    this.log(`exportObject.field2`);
  },
  exports: null // Required to export object
};
