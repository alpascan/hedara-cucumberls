let { setWorldConstructor, World } = require("@cucumber/cucumber")
let { Client, AccountBalanceQuery, Hbar } = require("@hashgraph/sdk")

require("dotenv").config()

// For now, this is a simple world that only contains the Hedera client
class CustomWorld extends World {
  client = null
  accounts = {
    main: {
      id: null,
      privateKey: null,
      expectedBalance: 1000,
    },
  }
  myAccountId = null
  myPrivateKey = null
  constructor(options) {
    super(options)
    this.setupMainAccount()
    this.setupClient()
  }

  async getBalanceForAccount(accountName) {
    // Set the operator to the account
    const account = this.accounts[accountName]
    this.client.setOperator(account.id, account.privateKey)

    const balance = await new AccountBalanceQuery()
      .setAccountId(account.id)
      .execute(this.client)

    return balance.hbars.toTinybars()
  }

  async createAccount() {
    const newAccountPrivateKey = PrivateKey.generateED25519()
    const newAccountPublicKey = newAccountPrivateKey.publicKey

    // Create the new account
    const newAccount = await new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(Hbar.fromTinybars(initialBalance))
      .execute(this.client)

    // Get the new account ID
    const getReceipt = await newAccount.getReceipt(this.client)
    const newAccountId = getReceipt.accountId

    // Return the new account object
    return {
      id: newAccountId,
      privateKey: newAccountPrivateKey,
    }
  }

  setupMainAccount() {
    this.accounts.main.id = process.env.HEDERA_ACCOUNT_ID
    this.accounts.main.privateKey = process.env.HEDERA_PRIVATE_KEY

    if (!this.accounts.main.id || !this.accounts.main.privateKey) {
      throw new Error(
        "Environment variables HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be present"
      )
    }
  }
  setupClient() {
    this.client = Client.forTestnet()
    this.client.setOperator(this.accounts.main.id, this.accounts.main.privateKey)
    this.client.setDefaultMaxTransactionFee(new Hbar(100))
    this.client.setDefaultMaxQueryPayment(new Hbar(50))
    console.log("Client is set up")
  }
}

setWorldConstructor(CustomWorld)
