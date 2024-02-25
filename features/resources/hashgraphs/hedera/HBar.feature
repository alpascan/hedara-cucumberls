Feature: This feature means to test the transfer of hBar from one account to another

  Background: 
    Given I have a main account with an initial balance greater than '1000'

  Scenario: This scenario tests the transfer of hBar from one account to another adress account
    And I create a new account 'account one' with an initial balance of '100'
    When I transfer '100' hBar from the main account to 'account one'
    Then the balance of 'account one' should be '200'

  @wip
  Scenario: This scerario tests the transfer of hbar from one account to an alias
    And I generate an alias 'alias two'
    And I transfer '100' hBar from the main account to the alias 'alias two'
    Then the balance of 'alias two' should be '100'
