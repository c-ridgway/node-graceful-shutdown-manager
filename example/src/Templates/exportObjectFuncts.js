/*

*/

module.exports = {
  async init() {
    //await database.modules.exportObject.promises.init(this);
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
  field3() {
    this.log(`exportObjectFuncts field3`);
  },
  exports: ['field3']
};
