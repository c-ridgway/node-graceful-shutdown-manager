/*
  Documentation: https://www.fastify.io/docs/v3.0.x/Request/

  Get Example
  URL: http://127.0.0.1:4000/value/pageExample?var1=true&var2=5
  Result: { "success": 1, "param1": "value", "var1": "true", "var2": "5" }
*/

module.exports = {
  async init() {
    this.log('http://127.0.0.1:4000/value/pageExample?var1=true&var2=5');

    // Get
    router.servers.http.get("/:param1/pageExample", async (request, reply) => {
      try {
        console.log(request.query);
        console.log(request.params);

        return { 
          success: 1,
          ...request.params,
          ...request.query
        };
      } catch (error) {
        console.error(e);

        return {
          error: e.message,
          stack: e.stack
        };
      }
    });
    
    // Post
    router.servers.http.post("/pageExample", async (request, reply) => {
      try {
        console.log(request.body);

        return { 
          success: 1
        };
      } catch (error) {
        console.error(e);

        return {
          error: e.message,
          stack: e.stack
        };
      }
    });
  }
};
