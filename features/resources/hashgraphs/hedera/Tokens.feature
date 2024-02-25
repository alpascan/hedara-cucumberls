Feature: This feature means to test the transfer of tokens from one account to another

  @wip
  Scenario: This scenario tests the transfer of a fungible tokens from one account to another adress account
    Given I create a new account 'account one'
    And I create a fungible token with the following details
      | tokenName          | 'testToken' |
      | tokenSymbol        | 'TT'        |
      | tokenDecimals      | '2'         |
      | tokenInitialSupply | '1000'      |
    And I associate the token with 'account one'
    And I transfer '100' tokens from the main account to 'account one'
    Then the token balance of 'account one' should be '100'

  Scenario: This scenario tests the transfer ot a non-fungible token from one account to another adress account
    Given I create a new account 'account one'
    And I create and mint a non-fungible token with the name 'testToken'
    And I associate the token with 'account one'
    And I transfer the NFT to 'account one'
    Then the NFT balance of 'account one' should be '1'
