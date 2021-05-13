process.env.NODE_ENV = process.argv[2] || "production"; // production/development

const production = process.env.NODE_ENV !== "development";
const gsm = require("graceful-shutdown-manager").create((production)? null: [["./src", "../src/*.js"]]); // Autoreload options, such as path to watch
const main = require("./src/main");

try {
  main(production, gsm);
} catch(error) {
  gsm.error(error); // Handle errors caught during init, awaits code changes in development mode instead of terminating
}