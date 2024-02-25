const { Given, When, Then } = require("@cucumber/cucumber")
const {
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
  TransferTransaction,
  PublicKey,
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
      privateKey: newAccountPrivateKey,
      expectedBalance: parseFloat(initialBalance),
    }

    console.log("The new account ID is: " + newAccountId)
  }
)

When(
  "I transfer {string} hBar from the main account to {string}",
  async function (amountToTransfor, accountToTransferTo) {
    amountToTransfor = parseFloat(amountToTransfor)
    // Input validation
    if (!this.accounts[accountToTransferTo]) {
      throw new Error(
        `Account ${accountToTransferTo} does not exist. Please create it first`
      )
    }
    if (this.accounts[accountToTransferTo].expectedBalance < amountToTransfor) {
      throw new Error(
        `Account ${accountToTransferTo} does not have enough balance to receive ${amountToTransfor}`
      )
    }

    // Create the transfer transaction
    const hbarTransaction = await new TransferTransaction()
      .addHbarTransfer(this.accounts.main.id, Hbar.fromTinybars(-amountToTransfor))
      .addHbarTransfer(
        this.accounts[accountToTransferTo].id,
        Hbar.fromTinybars(amountToTransfor)
      )
      .execute(this.client)

    // Verify the transaction reached consensus
    const transactionReceipt = await hbarTransaction.getReceipt(this.client)
    console.log(
      "\nThe transfer transaction from my account to the new account was: " +
        transactionReceipt.status.toString()
    )
    // Update the expected balances
    this.accounts.main.expectedBalance -= amountToTransfor
    this.accounts[accountToTransferTo].expectedBalance += amountToTransfor
  }
)

Then(
  "the balance of {string} should be {string}",
  async function (accountName, expectedBalance) {
    // Input validation
    expectedBalance = parseFloat(expectedBalance)
    if (!this.accounts[accountName]) {
      throw new Error(`Account ${accountName} does not exist. Please create it first`)
    }

    if (this.accounts[accountName].expectedBalance !== expectedBalance) {
      throw new Error(
        `Account ${accountName} has a balance of ${this.accounts[accountName].expectedBalance} but it should be ${expectedBalance}`
      )
    }

    // Get the actual balance from the network
    const balance = await this.getBalanceForAccount(accountName)

    // Compare the actual balance with the expected balance
    if (balance.toString() !== expectedBalance.toString()) {
      throw new Error(
        `Account ${accountName} has a balance of ${balance} but it should be ${expectedBalance}`
      )
    }
  }
)

Given(
  "I have a main account with an initial balance greater than {string}",
  async function (recommendedBalance) {
    recommendedBalance = parseFloat(recommendedBalance)
    const mainBalance = await this.getBalanceForAccount("main")
    this.accounts.main.expectedBalance = mainBalance
    if (mainBalance < recommendedBalance) {
      throw new Error(
        `Main account balance is ${mainBalance} but it should be greater than ${recommendedBalance}`
      )
    }
  }
)

Then("the balance of the main account should reflect the transfer", async function () {
  const mainBalance = await this.getBalanceForAccount("main")
  if (mainBalance !== this.accounts.main.expectedBalance) {
    throw new Error(
      `Main account has a balance of ${mainBalance} but it should be ${this.accounts.main.expectedBalance}`
    )
  }
})

Then("I generate an alias {string}", async function (accountName) {
  this.accounts[accountName] = {
    privateKey: PrivateKey.generateED25519(),
  } // expceting to generate a base32 string here?

  // acording to https://github.com/hashgraph/hedera-sdk-js/blob/develop/examples/account-alias.js
  this.accounts[accountName].alias =
    this.accounts[accountName].privateKey.publicKey.toString()
  this.accounts[accountName].id = PublicKey.fromString(
    this.accounts[accountName].alias
  ).toAccountId(0, 0)
})

Then(
  "I transfer {string} hBar from the main account to the alias {string}",
  async function (transferAmount, accountToTransferTo) {
    if (!this.accounts[accountToTransferTo].id) {
      throw new Error(
        `Alias ${accountToTransferTo} does not exist. Please create it first`
      )
    }
    transferAmount = parseFloat(transferAmount)
    if (this.accounts.main.expectedBalance < transferAmount) {
      throw new Error(
        `Main account does not have enough balance to transfer ${transferAmount}`
      )
    }
    this.accounts.main.expectedBalance -= transferAmount
    this.accounts[accountToTransferTo].expectedBalance = transferAmount
    const hbarTransaction = await new TransferTransaction()
      .addHbarTransfer(this.accounts.main.id, Hbar.fromTinybars(-transferAmount))
      .addHbarTransfer(
        this.accounts[accountToTransferTo].id,
        Hbar.fromTinybars(transferAmount)
      )
      .execute(this.client)
    const transactionReceipt = await hbarTransaction.getReceipt(this.client)
    console.log(
      "\nThe transfer transaction from the main account to the alias: " +
        transactionReceipt.status.toString()
    )
  }
)
