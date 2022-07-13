/* eslint-disable radix */
/* eslint-disable no-unused-expressions */
import { LightningElement } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getConfig from "@salesforce/apex/re_MainController.getConfig";
import saveConfig from "@salesforce/apex/re_MainController.saveConfig";

export default class RateCardMain extends NavigationMixin(LightningElement) {
  currentConfigId;
  config = {};
  // ruleset map -> Map<Id, {param, Map<name, rule>>}}
  ruleSetMap = new Map();
  ruleSetSaveDisabled = false;
  ruleSetEdited = false;

  // criteria component properties
  criteriaMap = new Map();
  criteriaSaveDisabled = false;
  criteriaEdited = false;

  activeTab = "rules";

  addNewConfigHandler() {
    this[NavigationMixin.Navigate]({
      type: "standard__objectPage",
      attributes: {
        objectApiName: "Rule_Engine__c",
        actionName: "new"
      }
    });
  }

  refreshConfigList() {
    this.template.querySelector("c-re-configs")?.refreshConfigList();
  }

  configClickHandler(event) {
    const { id } = event.detail;
    if (id && this.currentConfigId !== id) {
      this.currentConfigId = id;
      // delete current config
      this.resetProps();
      // fetch new config
      this.fetchConfig();
    }
  }

  fetchConfig() {
    getConfig({ configIdOrName: this.currentConfigId })
      .then((response) => {
        if (!response) {
          this.showNotification("Error", "No config found", "error");
        }
        this.config = JSON.parse(response) || {};
        this.init();
      })
      .catch((error) => {
        // throw error, name cannot be blank
        this.showNotification("Error", "Could not retrieve config", "error");
        console.error(error);
      });
  }

  setConfig() {
    saveConfig({
      configId: this.currentConfigId,
      config: JSON.stringify(this.config)
    })
      .then((response) => {
        if (!response) {
          this.showNotification("Error", "No config found", "error");
        } else {
          this.config = JSON.parse(response);
          this.init();

          // success notification
          this.showNotification("Updated", "Criterias updated successfully", "success");
        }
      })
      .catch((error) => {
        // throw error, name cannot be blank
        this.showNotification("Error", "Could not retrieve config", "error");
        console.error(error);
      });
  }

  init() {
    // mutate the objects first for modification
    const tempConfig = JSON.parse(JSON.stringify(this.config));
    // get the rule sets
    this.ruleSetMap = this.buildRuleSetMap(tempConfig.rules);
    // build criteria map
    this.criteriaMap = this.buildMap(tempConfig.criterias);
    // add criteria to session storage

    try {
      sessionStorage.setItem(
        "criterias",
        JSON.stringify(
          Array.from(this.criteriaMap.keys()).map((item) => {
            return { label: item, value: item };
          })
        )
      );
    } catch (e) {
      console.error(e);
    }
  }

  tabActiveHandler(event) {
    this.activeTab = event.target.value;
  }

  /////////////////////////////////////////////////////
  /////////// RULESET HANDLERS AND METHODS ////////////
  /////////////////////////////////////////////////////

  buildRuleSetMap(ruleSets) {
    const rsMap = new Map();
    if (ruleSets && ruleSets.length) {
      ruleSets.forEach((element) => {
        rsMap.set(element.id, {
          ruleset: element,
          rules: this.buildMap(element.rules)
        });
      });
    }
    return rsMap;
  }

  /**
   * Add new rule in a rule set
   * @returns
   */
  addNewRuleHandler(event) {
    const ruleSetId = event.detail;

    // check if the ruleset already has a blank rule, if so, throw error and just return
    if (this.ruleSetMap?.get(ruleSetId)?.rules.has("")) {
      this.showNotification("Error", "One blank rule already exist", "error");
      return;
    }
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.ruleSetMap]);
    tempRuleSetMap?.get(ruleSetId)?.rules?.set("", {
      name: "",
      order: (this.ruleSetMap?.get(ruleSetId)?.rules?.size || 0) + 1,
      type: "single",
      criterias: [],
      action: "return",
      actionValue: "",
      success: "stop",
      fail: "stop"
    });
    // trigger change for LWC framework to recognise
    this.ruleSetMap = tempRuleSetMap;
    // mark as edited
    this.ruleSetEdited = true;
    /* this.validateRules(
      Array.from(this.ruleSetMap.get(ruleSetId).rules.values())
    ); */
  }

  /**
   * On param change
   * @param {*} event
   */
  paramsChangeHandler(event) {
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.ruleSetMap]);
    // get ruleset where param is updated
    const ruleSet = tempRuleSetMap.get(event.detail.ruleSetId);
    const params = event.detail.params;
    if (ruleSet && params) {
      ruleSet.ruleset.appliedTo = params.split(",").map((x) => x.trim());
    }

    // trigger change for LWC framework to recognise
    this.ruleSetMap = tempRuleSetMap;
    // mark as edited
    this.ruleSetEdited = true;
    /* this.validateRules(
      Array.from(this.ruleSetMap.get(event.detail.ruleSetId).rules.values())
    ); */
  }

  /**
   * Update rule based on any changes
   * @param {*} event
   */
  ruleChangeHandler(event) {
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.ruleSetMap]);
    // get ruleset where rule is updated
    const ruleSet = tempRuleSetMap.get(event.detail.ruleSetId);
    if (ruleSet && ruleSet.rules) {
      const rule = ruleSet.rules.get(event.detail.rule);
      if (rule) {
        // get the actual change {key, value} in rule
        const change = event.detail.change;
        if (change && change.field) {
          // update the change in rule object
          rule[change.field] = change.value;

          // if rule name is changed, then delete old key and add new one
          if (change.field === "name" && event.detail.rule !== change.value) {
            // check if there is alreay an element in map with new key
            if (ruleSet.rules.has(change.value)) {
              this.showNotification("Duplicate Rule", "Auto updated rule name to make it unique.", "warning");
              change.value = (change.value + " 1").trim();
              rule[change.field] = change.value;
            } else {
              ruleSet.rules.delete(event.detail.rule); // delete existing key
              ruleSet.rules.set(change.value, rule); // add new key and value
            }
          } else {
            // update the rule object in map
            ruleSet.rules.set(event.detail.rule, rule);
          }
        }
      }
    }
    // trigger change for LWC framework to recognise
    this.ruleSetMap = tempRuleSetMap;
    // mark as edited
    this.ruleSetEdited = true;
    /* this.validateRules(
      Array.from(this.ruleSetMap.get(event.detail.ruleSetId).rules.values())
    ); */
  }

  /**
   * delete rule from ruleset
   * @param {*} event
   */
  ruleDeleteHandler(event) {
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.ruleSetMap]);
    // get ruleset where rule is updated
    const ruleSet = tempRuleSetMap.get(event.detail.ruleSetId);
    if (ruleSet && ruleSet.rules) {
      const ruleName = event.detail.rule;
      if (ruleSet.rules.has(ruleName)) ruleSet.rules.delete(ruleName);
    }
    // trigger change for LWC framework to recognise
    this.ruleSetMap = tempRuleSetMap;
    // mark as edited
    this.ruleSetEdited = true;
  }

  /**
   * Add new rule set row
   */
  handleNewRuleSet() {
    if (Array.from(this.ruleSetMap.values()).filter((x) => x.ruleset.appliedTo.length === 0).length > 0) {
      // throw error, name cannot be blank
      this.showNotification("Error", "One blank ruleset already exist", "error");
      return;
    }
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.ruleSetMap]);
    tempRuleSetMap.set(new Date().getTime(), {
      ruleset: { id: new Date().getTime(), rules: [], appliedTo: [] },
      rules: new Map()
    });
    // trigger change for LWC framework to recognise
    this.ruleSetMap = tempRuleSetMap;
    // mark as edited
    this.ruleSetEdited = true;
  }

  /**
   * delete ruleset
   */
  handleDeleteRuleSet({ detail }) {
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.ruleSetMap]);
    // delete ruleset if exist
    tempRuleSetMap.has(detail) && tempRuleSetMap.delete(detail);
    // trigger change for LWC framework to recognise
    this.ruleSetMap = tempRuleSetMap;
    // mark as edited
    this.ruleSetEdited = true;
  }

  /**
   * Reset the rule set to default
   */
  cancelRuleSetHandler() {
    // reset the rule set map
    this.ruleSetMap = this.buildRuleSetMap(JSON.parse(JSON.stringify(this.config)).rules);
    // remove action buttons
    this.ruleSetEdited = false;
  }

  saveRuleSetHandler() {
    const uniqueParams = new Set();
    const ruleSets = [];
    // validate all rules
    for (const [id, rs] of this.ruleSetMap) {
      // check for duplicate param configurations
      if (rs.ruleset.appliedTo && rs.ruleset.appliedTo.length) {
        for (const param of rs.ruleset.appliedTo) {
          if (uniqueParams.has(param)) {
            // duplicate param found, throw error
            this.showNotification("Error", `Duplicate param found: ${param}`, "error");
            return;
          }
          uniqueParams.add(param);
        }
      }

      // check for blank rules/subrules, blank criterias, or invalid criterias
      if (rs.rules && rs.rules.size && !this.validateRules(Array.from(rs.rules.values()))) {
        return;
      }
      // validation successful, add to rule set array
      ruleSets.push({
        id,
        appliedTo: rs.ruleset.appliedTo,
        rules: Array.from(rs.rules.values())
      });
    }
    // validation successful, save the rulesets
    this.config.rules = ruleSets;
    // remove action buttons
    this.ruleSetEdited = false;
    // save config
    this.setConfig();
  }

  /**
   * Validate rule and disable save button if blank rule
   * @param {*} rules
   */
  validateRules(rules) {
    if (rules && rules.length) {
      for (const rule of rules) {
        // if blank rule found, throw an error and disable save button
        if (!rule || !rule.name) {
          this.showNotification("Error", `Blank rules are not allowed`, "error");
          return false;
        }
        // check for invalid properties
        if (!rule.order || !rule.type || (rule.type === "single" && (!rule.action || !rule.actionValue)) || !rule.success || !rule.fail) {
          this.showNotification("Error", `Rule ${rule.name} has invalid properties`, "error");
          return false;
        }
        // if blank criteria found, throw an error and disable save button
        if (rule.criterias && rule.criterias.length) {
          for (const criteria of rule.criterias) {
            if (!criteria.criteria) {
              this.showNotification("Error", `Rule ${rule.name} has blank criterias`, "error");
              return false;
            }
            if (!criteria.order) {
              this.showNotification("Error", `Rule ${rule.name} has blank order`, "error");
              return false;
            }
            if (!this.criteriaMap.has(criteria.criteria)) {
              this.showNotification("Error", `Rule ${rule.name} has invalid criteria "${criteria.criteria}"`, "error");
              return false;
            }
          }
        }
        // check for nested rules
        if (rule.rules && rule.rules.length) {
          return this.validateRules(rule.rules);
        }
      }
    }

    // validation successful
    return true;
  }
  /////////////////////////////////////////////////////
  /////////// CRITERIA HANDLERS AND METHODS ///////////
  /////////////////////////////////////////////////////
  /**
   * Event handler when new criteria is added
   */
  addNewCriteriaHandler() {
    // if already has blank criteria, show error and return
    if (this.criteriaMap.has("")) {
      this.showNotification("Error", "One blank criteria already exist", "error");
      return;
    }
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempCriteriaMap = new Map([...this.criteriaMap]);
    tempCriteriaMap.set("", {
      name: "",
      field: "",
      comparison: "equals",
      considerCase: false,
      value: ""
    });
    // trigger change for LWC framework to recognise
    this.criteriaMap = tempCriteriaMap;
    // mark as edited
    this.criteriaEdited = true;
    this.validateCriterias();
  }

  /**
   * Event handler when a criteria is removed
   * @param {*} event
   */
  deleteCriteriaHandler(event) {
    // get the criteria to be removed
    const criteriaName = event.detail;
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempCriteriaMap = new Map([...this.criteriaMap]);
    // remove if criteria found
    tempCriteriaMap.has(criteriaName) && tempCriteriaMap.delete(criteriaName);

    // trigger change for LWC framework to recognise
    this.criteriaMap = tempCriteriaMap;
    // mark as edited
    this.criteriaEdited = true;
    this.validateCriterias();
  }

  /**
   * Event handler when a criteria is updated
   * @param {*} event
   */
  changeCriteriaHandler(event) {
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempCriteriaMap = new Map([...this.criteriaMap]);
    // get the criteria object from existing criterias map
    const criteria = tempCriteriaMap.get(event.detail.criteria);

    if (criteria) {
      // get the actual change {key, value} in criteria
      const change = event.detail.change;
      if (change && change.field) {
        // update the change in criteria object
        criteria[change.field] = change.value;

        // if criteria name is changed, then delete old key and add new one
        if (change.field === "name" && event.detail.criteria !== change.value) {
          // check if there is alreay an element in map with new key
          if (tempCriteriaMap.has(change.value)) {
            this.showNotification("Duplicate Criteria", "Auto updated criteria name to make it unique.", "warning");
            change.value = (change.value + " 1").trim();
            criteria[change.field] = change.value;
          }
          tempCriteriaMap.delete(event.detail.criteria); // delete existing key
          tempCriteriaMap.set(change.value, criteria); // add new key and value
        } else {
          // update the criteria object in map
          tempCriteriaMap.set(event.detail.criteria, criteria);
        }
      }
    }
    // trigger change for LWC framework to recognise
    this.criteriaMap = tempCriteriaMap;
    // mark as edited
    this.criteriaEdited = true;
    this.validateCriterias();
  }

  /**
   * discard all changes
   */
  cancelClickHandler() {
    // build criteria map from original config
    this.criteriaMap = this.buildMap(JSON.parse(JSON.stringify(this.config)).criterias);
    // mark as edited
    this.criteriaEdited = false;
  }

  /**
   * Save all criteria changes permanently
   */
  saveCriteriasHandler() {
    // validate the json
    for (const [name, criteria] of this.criteriaMap) {
      if (!name || !criteria.name) {
        // throw error, name cannot be blank
        this.showNotification("Error", "Criteria name cannot be blank", "error");
        return;
      }
      if (!criteria.field) {
        // throw error, field cannot be blank
        this.showNotification("Error", `Field api name cannot be blank for ${name}`, "error");
        return;
      }
    }

    // validation successful, save the criterias
    this.config.criterias = Array.from(this.criteriaMap.values());
    // mark as edited
    this.criteriaEdited = false;
    // save config
    this.setConfig();
  }

  /**
   * Validate the criterias
   * if any criteria is empty, then disable save button
   */
  validateCriterias() {
    this.criteriaSaveDisabled = this.criteriaMap.has("");
  }

  resetProps() {
    this.config = {};
    // ruleset map -> Map<Id, {param, Map<name, rule>>}}
    this.ruleSetMap = new Map();
    this.ruleSetSaveDisabled = false;
    this.ruleSetEdited = false;

    // criteria component properties
    this.criteriaMap = new Map();
    this.criteriaSaveDisabled = false;
    this.criteriaEdited = false;
  }

  get showComponent() {
    return this.currentConfigId ? true : false;
  }

  get isRulesTabActive() {
    return this.currentConfigId && this.activeTab === "rules";
  }
  get isCriteriasTabActive() {
    return this.currentConfigId && this.activeTab === "criterias";
  }

  /////////////////////////////////////////////////////
  ///////////             UTILS             ///////////
  /////////////////////////////////////////////////////

  // build the map from the array
  buildMap(obj) {
    const objClone = new Map();
    if (obj && obj.length) {
      obj.forEach((element) => {
        objClone.set(element.name, element);
      });
    }
    return objClone;
  }

  showNotification(title, message, variant) {
    const evt = new ShowToastEvent({
      title,
      message,
      variant
    });
    this.dispatchEvent(evt);
  }
}
