public class re_RuleEngine {
  private static re_RuleEngine instance = null;
  private String config = '';
  private List<Rule> matchedRules = new List<Rule>();

  public Map<String, Criteria> criteriaMap;
  public Map<String, List<Rule>> rulesMap;

  // custom exception
  public class re_InvalidConfigException extends Exception {
  }
  public class re_InvalidFieldException extends Exception {
  }

  private re_RuleEngine(String rules) {
    Process process;
    try {
      process = (Process) JSON.deserialize(rules, Process.class);
    } catch (Exception e) {
      throw new re_InvalidConfigException('Invalid Rule Configuration', e);
    }
    config = rules;
    matchedRules = new List<Rule>();
    // build a map of param and rules
    rulesMap = getRulesMap(process);
    // build a map of criteria name and criteria
    criteriaMap = getCriteriaMap(process);
  }

  /**
   * Get the singleton instance of the RuleEngine
   * This will avoid unncessary processing of same config multiple times
   * in a single transaction
   */
  public static re_RuleEngine getInstance(String configName) {
    String config = re_MainController.getConfig(configName);
    if (instance != null && instance.config.equals(config)) {
      return instance;
    }
    instance = new re_RuleEngine(config);

    return instance;
  }

  public String run(String param, SObject sObj) {
    // get list of rules applicable to param
    List<Rule> rules = rulesMap.get(param);

    if (rules == null || rules.size() == 0)
      return 'No matching rules found';

    // find all matching rules
    findMatchingRules(rules, 0, sObj);

    if (matchedRules == null || matchedRules.size() == 0)
      return 'No matching rules found';

    String result = '';
    for (Rule rule : matchedRules) {
      if (rule.action == 'return') {
        result += rule.actionValue + ',';
      } else if (rule.action == 'apex') {
        // call apex method here
        re_CallableMethods callableMethods = new re_CallableMethods();
        callableMethods.call(rule.actionValue, new Map<String, Object>());
      }
    }
    return result.length() > 0 ? result.removeEnd(',') : result;
  }

  /**
   * Process all the rules in a param until found a matching rule
   * with next action as stop
   * Return matched rule is found, else return null
   */
  public Rule findMatchingRules(List<Rule> rules, Integer index, SObject sObj) {
    // return false if rule does not exist (index is greater than rule list size)
    if (index >= rules.size()) {
      return null;
    }

    Rule rule = rules.get(index);
    String successAction = rule.success;
    String failureAction = rule.fail;

    Integer result = 1;
    if (rule.criterias != null && rule.criterias.size() > 0) {
      result = isRuleMatched(rule.criterias, 0, 0, sObj);
    }

    // error in executing rule criterias, return null
    if (result < 0) {
      return null;
    }

    // nested rules
    if (String.isNotBlank(rule.type) && rule.type.equalsIgnoreCase('nested')) {
      // execute next nested rule only if current rule is matched
      if (result == 1) {
        // get list of nested rules
        List<Rule> nestedRules = rule.rules;
        if (nestedRules != null && nestedRules.size() > 0) {
          // start processing nested rules, reset index to 0
          return findMatchingRules(nestedRules, 0, sObj);
        }
        return null; // no nested rule found
      } else {
        return null; // no rule is matched
      }
    } else {
      // single rules
      if (result == 1) {
        // execute success action
        matchedRules.add(rule);
        switch on successAction {
          when null, 'stop' {
            // return current matched rule
            return rule;
          }
          when else {
            // execute next rule
            return findMatchingRules(rules, index + 1, sObj);
          }
        }
      } else {
        // execute failure action as rule is not matched
        switch on failureAction {
          when null, 'stop' {
            return null; // no rule matched
          }
          when else {
            // execute next rule
            return findMatchingRules(rules, index + 1, sObj);
          }
        }
      }
    }
  }

  /**
   * Check if all the criterias of a rule are matched or not
   * Return 1 if all criterias are matched
   * Return 0 if any of the criteria fails
   * Else return error code
   *  -1 > Criteria not found
   */
  public Integer isRuleMatched(List<RuleCriteria> criterias, Integer index, Integer result, SObject sObj) {
    // return current result if index is greater than criterias list size
    if (index >= criterias.size()) {
      return result;
    }
    // get current rule criteria
    RuleCriteria rc = criterias.get(index);

    // get criteria mapped to rule criteria
    Criteria criteria = criteriaMap.get(rc.criteria);
    // return false if criteria is not found/defined
    if (criteria == null) {
      return -1;
    }

    // check if criteria is matched
    Boolean criteriaResult = isCriteriaMatched(criteria, sObj);
    // recursively call this method to find out overall rule matched
    switch on rc.type {
      when 'AND' {
        return isRuleMatched(criterias, index + 1, getInt(getBoolean(result) && criteriaResult), sObj);
      }
      when else {
        return isRuleMatched(criterias, index + 1, getInt(getBoolean(result) || criteriaResult), sObj);
      }
    }
  }

  public Boolean isCriteriaMatched(Criteria criteria, SObject sObj) {
    String comparison = criteria.comparison;
    String valueToCompare = String.valueOf(criteria.value);
    Boolean considerCase = criteria.considerCase;
    String fieldValue;

    try {
      fieldValue = String.valueOf(sObj.get(criteria.field));
    } catch (Exception e) {
      throw new re_InvalidConfigException('Invalid Field Name', e);
    }

    if (String.isBlank(fieldValue)) {
      if (String.isBlank(valueToCompare))
        return true;
      return false;
    }

    // get current criteria result
    switch on comparison {
      when 'equals' {
        return considerCase ? fieldValue.equalsIgnoreCase(valueToCompare) : fieldValue.equals(valueToCompare);
      }
      when 'contains' {
        return considerCase ? fieldValue.containsIgnoreCase(valueToCompare) : fieldValue.contains(valueToCompare);
      }
      when 'higher' {
        return fieldValue > valueToCompare;
      }
      when 'less' {
        return fieldValue < valueToCompare;
      }
      // else compare with equals
      when else {
        return considerCase ? fieldValue.equalsIgnoreCase(valueToCompare) : fieldValue.equals(valueToCompare);
      }
    }
  }

  public Map<String, List<Rule>> getRulesMap(Process process) {
    Map<String, List<Rule>> rulesMap;
    if (process != null && process.rules != null && process.rules.size() > 0) {
      rulesMap = new Map<String, List<Rule>>();
      for (RuleSet ruleSet : process.rules) {
        // sort all the rules by order
        List<Rule> rules;
        if (ruleSet.rules != null && ruleSet.rules.size() > 0) {
          rules = ruleSet.rules;
          //process and sort inner rules and criterias
          for (Rule rule : rules) {
            sortRule(rule);
          }
          // sort ruleSet rules by order
          rules.sort();
        }
        // get all the params where above rules are applied
        if (ruleSet.appliedTo != null && ruleSet.appliedTo.size() > 0) {
          for (String param : ruleSet.appliedTo) {
            // build map of ruleSet and rules
            rulesMap.put(param, rules);
          }
        }
      }
    }
    return rulesMap;
  }

  public Map<String, Criteria> getCriteriaMap(Process process) {
    Map<String, Criteria> criteriaMap;
    if (process != null && process.criterias != null && process.criterias.size() > 0) {
      criteriaMap = new Map<String, Criteria>();
      for (Criteria criteria : process.criterias) {
        criteriaMap.put(criteria.name, criteria);
      }
    }
    return criteriaMap;
  }

  public void sortRule(Rule rule) {
    if (rule.rules != null && rule.rules.size() > 0) {
      for (Rule r : rule.rules) {
        sortRule(r);
      }
      rule.rules.sort();
    }
    if (rule.criterias != null && rule.criterias.size() > 0) {
      rule.criterias.sort();
    }
  }

  public Boolean getBoolean(Integer i) {
    return i > 0 ? true : false;
  }

  public Integer getInt(Boolean b) {
    return b ? 1 : 0;
  }

  public class Criteria {
    @AuraEnabled
    public String name;
    @AuraEnabled
    public String field;
    @AuraEnabled
    public String comparison; //{EQUALS, CONTAINS, GT, LT}
    @AuraEnabled
    public Boolean considerCase = false;
    @AuraEnabled
    public String value;
  }

  public class RuleCriteria implements Comparable {
    @AuraEnabled
    public String criteria;
    @AuraEnabled
    public String type;
    @AuraEnabled
    public Integer order;

    public Integer compareTo(Object objToCompare) {
      RuleCriteria rCriteria = (RuleCriteria) objToCompare;
      return order > rCriteria.order ? 1 : -1;
    }
  }

  public class Rule implements Comparable {
    @AuraEnabled
    public String name;
    @AuraEnabled
    public Integer order;
    @AuraEnabled
    public String type; //{ONLY, COMPOSITE}
    @AuraEnabled
    public String action;
    @AuraEnabled
    public String actionValue;
    @AuraEnabled
    public String success;
    @AuraEnabled
    public String fail;
    @AuraEnabled
    public List<RuleCriteria> criterias;
    @AuraEnabled
    public List<Rule> rules;

    public Integer compareTo(Object objToCompare) {
      Rule rule = (Rule) objToCompare;
      return order > rule.order ? 1 : -1;
    }
  }

  public class RuleSet {
    @AuraEnabled
    public List<String> appliedTo;
    @AuraEnabled
    public List<Rule> rules;
  }

  public class Process {
    @AuraEnabled
    public List<Criteria> criterias;
    @AuraEnabled
    public List<RuleSet> rules;
  }
}
