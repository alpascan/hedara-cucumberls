let { setWorldConstructor, World } = require("@cucumber/cucumber")
let { Client } = require("@hashgraph/sdk")

require("dotenv").config()


// For now, this is a simple world that only contains the Hedera client
class CustomWorld extends World {
  client = null
  constructor(options) {
    super(options)
    this.setupClient()
  }

  setupClient() {
    const myAccountId = process.env.HEDERA_ACCOUNT_ID
    const myPrivateKey = process.env.HEDERA_PRIVATE_KEY

    if (!myAccountId || !myPrivateKey) {
      throw new Error(
        "Environment variables HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be present"
      )
    }

    this.client = Client.forTestnet()
    this.client.setOperator(myAccountId, myPrivateKey)
    console.log("Client is set up")
  }
}

setWorldConstructor(CustomWorld)
