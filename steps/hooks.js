const { AfterAll, Before, BeforeAll } = require("@cucumber/cucumber")

BeforeAll(function () {
  console.log("Setting up the client")
})
AfterAll(function () {
  console.log("Closing the client")
})
