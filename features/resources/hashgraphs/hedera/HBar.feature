Feature: This is a hello world Feature

  Scenario: This is a hello world Scenario
    Given I create a new account 'account one' with an initial balance of '1000'
    And I create a new account 'account two' with an initial balance of '100'
    When I transfer '100' hBar from 'account one' to 'account two'
    Then the balance of 'account one' should be '900'
    And the balance of 'account two' should be '200'
