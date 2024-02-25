Feature: This feature means to test the transfer of hBar from one account to another

  Background: 
    Given I have a main account with an initial balance greater than '1000'

  Scenario: This scenario tests the transfer of hBar from one account to another adress account
    And I create a new account 'account two' with an initial balance of '100'
    When I transfer '100' hBar from the main account to 'account two'
    And the balance of 'account two' should be '200'
