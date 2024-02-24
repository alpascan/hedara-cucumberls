const { Given, When, Then } = require("@cucumber/cucumber")
const {
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
} = require("@hashgraph/sdk")

Given(
  "I create a new account {string} with an initial balance of {string}",
  async function (accountName, initialBalance) {
    initialBalance = parseFloat(initialBalance)
    // Generate a new key pair
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

    // Store the account ID and expected balance
    this.accounts = this.accounts || {}
    this.accounts[accountName] = {
      id: newAccountId,
      expectedBalance: parseFloat(initialBalance),
    }

    console.log("The new account ID is: " + newAccountId)
  }
)

When(
  "I transfer {string} hBar from {string} to {string}",
  async function (amountToTransfor, accountToTransferFrom, accountToTransferTo) {
    amountToTransfor = parseFloat(amountToTransfor)
    // Input validation
    if (!this.accounts[accountToTransferFrom]) {
      throw new Error(
        `Account ${accountToTransferFrom} does not exist. Please create it first`
      )
    }
    if (!this.accounts[accountToTransferTo]) {
      throw new Error(
        `Account ${accountToTransferTo} does not exist. Please create it first`
      )
    }
    if (this.accounts[accountToTransferFrom].expectedBalance < amountToTransfor) {
      throw new Error(
        `Account ${accountToTransferFrom} does not have enough balance to transfer ${amountToTransfor}`
      )
    }
    if (this.accounts[accountToTransferTo].expectedBalance < amountToTransfor) {
      throw new Error(
        `Account ${accountToTransferTo} does not have enough balance to receive ${amountToTransfor}`
      )
    }

    // Transfer
    const transaction = await new TransferTransaction()
      .addHbarTransfer(
        this.accounts[accountToTransferFrom].id,
        Hbar.fromTinybars(-1 * amountToTransfor)
      )
      .addHbarTransfer(
        this.accounts[accountToTransferTo].id,
        Hbar.fromTinybars(amountToTransfor)
      )
      .execute(this.client)

    // Update the expected balances
    this.accounts[accountToTransferFrom].expectedBalance -= amountToTransfor
    this.accounts[accountToTransferTo].expectedBalance += amountToTransfor

    // Confirm the transaction reached consensus
    //const getReceipt = await transaction.getReceipt(this.client)
    //console.log("The transfer was successful: " + getReceipt.status.toString())
  }
)

Then(
  "the balance of {string} should be {string}",
  async function (accountName, expectedBalance) {
    expectedBalance = parseFloat(expectedBalance)
    if (!this.accounts[accountName]) {
      throw new Error(`Account ${accountName} does not exist. Please create it first`)
    }
    if (this.accounts[accountName].expectedBalance !== expectedBalance) {
      throw new Error(
        `Account ${accountName} has a balance of ${this.accounts[accountName].expectedBalance} but it should be ${expectedBalance}`
      )
    }
    const balance = await new AccountBalanceQuery()
      .setAccountId(this.accounts[accountName].id)
      .execute(this.client)
    if (balance.hbars.toTinybars() !== expectedBalance) {
      throw new Error(
        `Account ${accountName} has a balance of ${balance.hbars.toTinybars()} but it should be ${expectedBalance}`
      )
    }
  }
)
