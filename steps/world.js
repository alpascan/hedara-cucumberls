import "dotenv/config"
import { setWorldConstructor, World } from "cucumber"
//Grab your Hedera testnet account ID and private key from your .env file

//Grab your Hedera testnet account ID and private key from your .env file
const myAccountId = process.env.MY_ACCOUNT_ID
const myPrivateKey = process.env.MY_PRIVATE_KEY

class CustomWorld extends World {
  client
  constructor(options) {
    super(options)
  }
}

setWorldConstructor(CustomWorld)
