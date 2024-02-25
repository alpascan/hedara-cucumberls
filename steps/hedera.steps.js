const { Given, When, Then } = require("@cucumber/cucumber")
const {
  AccountId,
  PrivateKey,
  Hbar,
  TransferTransaction,
  PublicKey,
  TokenType,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenAssociateTransaction,
  AccountBalanceQuery,
} = require("@hashgraph/sdk")

Given(
  "I create a new account {string} with an initial balance of {string}",
  async function (accountName, initialBalance) {
    await this.createAccount(accountName, initialBalance)
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

Given("I create a new account {string}", async function (accountName) {
  await this.createAccount(accountName)
})

Given("I create a fungible token with the following details", async function (dataTable) {
  const tokenName = dataTable.rowsHash().tokenName
  const tokenSymbol = dataTable.rowsHash().tokenSymbol
  const tokenDecimals = parseInt(dataTable.rowsHash().tokenDecimals)
  const initialSupply = parseFloat(dataTable.rowsHash().initialSupply)
  const treasuryAccountId = AccountId.fromString(this.accounts.main.id)
  const treasuryPrivateKey = PrivateKey.fromString(this.accounts.main.privateKey)
  let tokenCreateTransaction = await new TokenCreateTransaction()
    .setTokenName(tokenName)
    .setTokenSymbol(tokenSymbol)
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(tokenDecimals)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(treasuryAccountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(treasuryPrivateKey)
    .freezeWith(this.client)
  const tokenCreateTxSigned = await tokenCreateTransaction.sign(
    this.accounts.main.privateKey
  )
  const tokenCreateTxSubmitted = await tokenCreateTxSigned.execute(this.client)
  const tokenCreateReceipt = await tokenCreateTxSubmitted.getReceipt(this.client)
  this.ftokenId = tokenCreateReceipt.tokenId

  console.log(`The new fungible token ID is: ${this.ftokenId}`)
})

Then(
  "the token balance of {string} should be {string}",
  async function (accountToBeQueried, expectedBalance) {
    accountBalance = await new AccountBalanceQuery()
      .setAccountId(this.accounts[accountToBeQueried].id)
      .execute(this.client)

    assert.equal(
      accountBalance.tokens.get(this.ftokenId).toString(),
      expectedBalance,
      `The token balance of ${accountToBeQueried} is not ${expectedBalance}`
    )
  }
)

Given("I associate the token with {string}", async function (accountName) {
  if (!this.ftokenId) {
    throw new Error("Token ID not set")
  }

  if (!this.accounts[accountName]) {
    throw new Error(`Account ${accountName} does not exist. Please create it first`)
  }

  let associateTransaction = await new TokenAssociateTransaction()
    .setAccountId(this.accounts[accountToTransferTo].id)
    .setTokenIds([tokenId])
    .freezeWith(this.client)
    .sign(this.accounts[accountName].privateKey)

  let associateTransactionResponse = await associateTransaction.execute(this.client)
  let associateTransactionReceipt = await associateTransactionResponse.getReceipt(
    this.client
  )

  console.log(associateTransactionReceipt.status.toString())
})

Given(
  "I transfer {string} tokens from the main account to {string}",
  async function (ammountToTransfer, accountToTransferTo) {
    if (!this.ftokenId) {
      throw new Error("Token ID not set")
    }
    if (!this.accounts[accountToTransferTo]) {
      throw new Error(
        `Account ${accountToTransferTo} does not exist. Please create it first`
      )
    }
    ammountToTransfer = parseFloat(ammountToTransfer)
    let tokenTransferTransaction = await new TransferTransaction()
      .addTokenTransfer(this.ftokenId, this.accounts.main.id, -ammountToTransfer)
      .addTokenTransfer(
        this.ftokenId,
        this.accounts[accountToTransferTo].id,
        ammountToTransfer
      )
      .freezeWith(this.client)
      .sign(this.accounts.main.privateKey)

    let tokenTransferTransactionResponse = await tokenTransferTransaction.execute(
      this.client
    )
    let tokenTransferTransactionReceipt =
      await tokenTransferTransactionResponse.getReceipt(this.client)

    console.log(
      "Token transaction finished with status ",
      tokenTransferTransactionReceipt.status.toString()
    )
  }
)

Given(
  "I create and mint a non-fungible token with the name {string}",
  async function (nftName) {
    if (!this.accounts.main.id || !this.accounts.main.privateKey) {
      throw new Error("Main account not set up")
    }
    if (!this.client) {
      throw new Error("Client not set up")
    }

    const tokenCreateTransaction = await new TokenCreateTransaction()
      .setTokenName(nftName)
      .setTokenSymbol("NFT")
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(this.accounts.main.id)
      .setAdminKey(this.accounts.main.privateKey)
      .setInitialSupply(0)
      .execute(this.client)

    const tokenCreateReceipt = await tokenCreateTransaction.getReceipt(this.client)
    this.nfTokenId = tokenCreateReceipt.tokenId
    console.log(`The new NFT token ID is: ${this.nfTokenId}`)

    // Don't really know where I can get these CID's from
    const CID = [
      Buffer.from(
        "ipfs://bafyreiao6ajgsfji6qsgbqwdtjdu5gmul7tv2v3pd6kjgcw5o65b2ogst4/metadata.json"
      ),
      Buffer.from(
        "ipfs://bafyreic463uarchq4mlufp7pvfkfut7zeqsqmn3b2x3jjxwcjqx6b5pk7q/metadata.json"
      ),
      Buffer.from(
        "ipfs://bafyreihhja55q6h2rijscl3gra7a3ntiroyglz45z5wlyxdzs6kjh2dinu/metadata.json"
      ),
      Buffer.from(
        "ipfs://bafyreidb23oehkttjbff3gdi4vz7mjijcxjyxadwg32pngod4huozcwphu/metadata.json"
      ),
      Buffer.from(
        "ipfs://bafyreie7ftl6erd5etz5gscfwfiwjmht3b52cevdrf7hjwxx5ddns7zneu/metadata.json"
      ),
    ]

    const mintTransaction = await new TokenMintTransaction()
      .setTokenId(this.nfTokenId)
      .setMetadata(CID)
      .setMaxTransactionFee(new Hbar(20))
      .freezeWith(this.client)
      .sign(this.accounts.main.privateKey)

    const mintTransactionResponse = await mintTransaction.execute(this.client)
    const mintTransactionReceipt = await mintTransactionResponse.getReceipt(this.client)

    console.log(
      "The NFT mint transaction finished with status ",
      mintTransactionReceipt.status.toString()
    )
  }
)

Then(
  "the NFT balance of {string} should be {string}",
  async function (accountName, expectedBalance) {
    if (!this.nfTokenId) {
      throw new Error("Token ID not set")
    }
    if (!this.accounts[accountName]) {
      throw new Error(`Account ${accountName} does not exist. Please create it first`)
    }
    const accountBalance = await new AccountBalanceQuery()
      .setAccountId(this.accounts[accountName].id)
      .execute(this.client)

    balace = accountBalance.tokens._map.get(this.nfTokenId).toString()

    assert.equal(
      balace,
      expectedBalance,
      `The NFT balance of ${accountName} is not ${expectedBalance}`
    )
  }
)

Given("I transfer the NFT to {string}", async function (accountName) {
  if (!this.nfTokenId) {
    throw new Error("Token ID not set")
  }
  if (!this.accounts[accountName]) {
    throw new Error(`Account ${accountName} does not exist. Please create it first`)
  }
  const TransferTransaction = await new TokenTransferTransaction()
    .addftTransfer(
      this.nfTokenId,
      1,
      this.accounts.main.id,
      this.accounts[accountName].id
    )
    .freezeWith(this.client)
    .sign(this.accounts.main.privateKey)

  const TransferTransactionResponse = await TransferTransaction.execute(this.client)
  const TransferTransactionReceipt = await TransferTransactionResponse.getReceipt(
    this.client
  )

  console.log(
    "The NFT transfer transaction finished with status ",
    TransferTransactionReceipt.status.toString()
  )
})
