const { Given, When, Then } = require("@cucumber/cucumber")
const {
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
  Client,
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

    mainBalance = await this.getBalanceForAccount("main")
    const sendHbar = await new TransferTransaction()
      .addHbarTransfer(this.accounts.main.id, Hbar.fromTinybars(-amountToTransfor))
      .addHbarTransfer(
        this.accounts[accountToTransferTo].id,
        Hbar.fromTinybars(amountToTransfor)
      )
      .execute(this.client)

    // Verify the transaction reached consensus
    const transactionReceipt = await sendHbar.getReceipt(this.client)
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
    expectedBalance = parseFloat(expectedBalance)
    if (!this.accounts[accountName]) {
      throw new Error(`Account ${accountName} does not exist. Please create it first`)
    }

    // Throw error for Cucumber writer to check values.
    if (this.accounts[accountName].expectedBalance !== expectedBalance) {
      throw new Error(
        `Account ${accountName} has a balance of ${this.accounts[accountName].expectedBalance} but it should be ${expectedBalance}`
      )
    }
    const balance = await this.getBalanceForAccount(accountName)
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
