/**
 * Main APEX Controller for Rule Engine LWC Components
 * Return records based on user's record access
 */
public with sharing class re_MainController {
  public class re_NoConfigFoundException extends Exception {
  }

  /**
   * Return JSON config based on provided config name and user's access
   * @param {String} configName
   */
  @AuraEnabled
  public static String getConfig(String configIdOrName) {
    // get rate card config
    List<Rule_Engine__c> configs = [SELECT Id, Name, Config__c FROM Rule_Engine__c WHERE Name = :configIdOrName OR Id = :configIdOrName];
    if (configs != null && configs.size() > 0) {
      return configs[0].Config__c;
    }
    throw new re_NoConfigFoundException('No config found for name or id: ' + configIdOrName);
  }

  /**
   * Update a JSON config based on provided config name and user's access
   * Return updated config
   * @param {String} configName
   * @param {String} config
   */
  @AuraEnabled
  public static String saveConfig(String configId, String config) {
    // get rate card config
    List<Rule_Engine__c> configs = [SELECT Id FROM Rule_Engine__c WHERE Id = :configId];
    // update config
    if (configs != null && configs.size() > 0) {
      String id = configs[0].Id;
      Rule_Engine__c reConfig = new Rule_Engine__c(Id = id, Config__c = config);
      update reConfig;
      // return configuration back to caller
      return reConfig.Config__c;
    }
    throw new re_NoConfigFoundException('No config found for id: ' + configId);
  }

  /**
   * Return all JSON configs names user has access to
   * Sorted by config name
   */
  @AuraEnabled
  public static List<Rule_Engine__c> getAllConfig() {
    // get rate card config
    return [SELECT Id, Name FROM Rule_Engine__c ORDER BY Name];
  }

  /**
   * Get all sobjects list
   */
  @AuraEnabled(cacheable=true)
  public static List<String> getSobjects() {
    List<String> objects = new List<String>();
    for (Schema.SObjectType o : Schema.getGlobalDescribe().values()) {
      objects.add(o.getDescribe().getName());
    }
    return objects;
  }
}
