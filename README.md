# Apex Rule Engine

The rule engine allows you to define complex record rules and actions. Simply put, it's a process builder running in an Apex context.

### Features

- Allows easy creation of record-based rules using a simple plain UI.
- Can handle complex criteria and rules. Supports nested rules.
- Execute actions such as "Return a value" or "Call an apex method".
- Instant feature delivery of new changes.
- Supports rule translations in plain English for faster case resolution.

### Terminology

- **Criteria** - A criteria helps in evaluating a rule based on certain conditions.
- **Single Rule** - A single rule has criteria for evaluation and produces a result on successful evaluation.
- **Nested Rule** - A nested rule has criteria for evaluation but does not produce any result, rather it acts as a guard check for deeper single rules.
- **Next Action** - Next actions instruct the rule engine to stop or execute the next rule based on the rule configuration.
- **Ruleset** - Ruleset is grouping of multiple rules based on a single attribute/entry param. Like recordtype in salesforce.

## This product is in beta phase at the moment
