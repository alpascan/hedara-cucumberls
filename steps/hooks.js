const { AfterAll, Before } = require("@cucumber/cucumber")

Before(function () {
  if (!this.accounts.main.id || !this.accounts.main.privateKey) {
    throw new Error("Main account not set up")
  }
  if (!this.client) {
    throw new Error("Client not set up")
  }

  this.accounts.main.expectedBalance = this.getBalanceForAccount("main")
})
AfterAll(function () {
  console.log("Closing the client")
})
