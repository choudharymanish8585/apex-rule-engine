/* eslint-disable no-unused-expressions */
import { LightningElement, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class RateCardRule extends LightningElement {
  @api ruleName;
  @api ruleType = "single";
  @api ruleOrder = 1; // default value
  @api success = "stop"; // default value
  @api failure = "next"; // default value
  @api action = "return"; // default value
  @api actionValue = ""; // default value
  @api
  set criterias(value) {
    this.pvtCriterias = value
      ? JSON.parse(JSON.stringify(value)).sort((a, b) => a.order - b.order)
      : [];
  }
  get criterias() {
    return this.pvtCriterias;
  }
  @api
  set rules(value) {
    this.pvtRulesMap = value
      ? this.buildMap(JSON.parse(JSON.stringify(value)))
      : new Map();
  }
  get rules() {
    return this.pvtRulesMap;
  }
  pvtCriterias;
  pvtRulesMap;

  handleNameChange(e) {
    const ruleName = e.target.value;
    this.fireChangeEvent("name", ruleName.trim());
  }
  handleRuleTypeChange(e) {
    const ruleType = e.target.value;
    this.fireChangeEvent("type", ruleType.trim());
  }
  handleActionChange(e) {
    const action = e.target.value;
    this.fireChangeEvent("action", action);
  }
  handleActionValueChange(e) {
    const actionValue = e.target.value;
    this.fireChangeEvent("actionValue", actionValue);
  }
  handleSuccessChange(e) {
    const success = e.target.value;
    this.fireChangeEvent("success", success.trim());
  }
  handleFailureChange(e) {
    const failure = e.target.value;
    this.fireChangeEvent("fail", failure.trim());
  }
  handleOrderChange(e) {
    const order = e.target.value;
    this.fireChangeEvent("order", order);
  }

  nestedRuleAddHandler(event) {
    event.stopPropagation();
    // check if the ruleset already has a blank rule, if so, throw error and just return
    if (this.pvtRulesMap.has("")) {
      this.showNotification("Error", "One blank rule already exist", "error");
      return;
    }

    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.pvtRulesMap]);
    tempRuleSetMap?.set("", {
      name: "",
      order: (this.pvtRulesMap.size || 0) + 1,
      type: "single",
      criterias: [],
      action: "return",
      actionValue: "",
      success: "stop",
      fail: "stop"
    });
    // trigger change for LWC framework to recognise
    this.pvtRulesMap = tempRuleSetMap;

    const rules = Array.from(this.pvtRulesMap.values());
    this.fireChangeEvent("rules", rules);
  }

  nestedRuleDeletedHandler(event) {
    event.stopPropagation();
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.pvtRulesMap]);
    // get rule and delete
    tempRuleSetMap.has(event.detail.rule) &&
      tempRuleSetMap.delete(event.detail.rule);
    // trigger change for LWC framework to recognise
    this.pvtRulesMap = tempRuleSetMap;

    const rules = Array.from(this.pvtRulesMap.values());
    this.fireChangeEvent("rules", rules);
  }

  nestedRuleChangeHandler(event) {
    event.stopPropagation();
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const tempRuleSetMap = new Map([...this.pvtRulesMap]);
    if (tempRuleSetMap) {
      const rule = tempRuleSetMap.get(event.detail.rule);
      if (rule) {
        // get the actual change {key, value} in rule
        const change = event.detail.change;
        if (change && change.field) {
          // update the change in rule object
          rule[change.field] = change.value;

          // if rule name is changed, then delete old key and add new one
          if (change.field === "name" && event.detail.rule !== change.value) {
            // check if there is alreay an element in map with new key
            if (tempRuleSetMap.has(change.value)) {
              this.showNotification(
                "Duplicate Rule",
                "Auto updated rule name to make it unique.",
                "warning"
              );
              change.value = (change.value + " 1").trim();
              rule[change.field] = change.value;
            } else {
              tempRuleSetMap.delete(event.detail.rule); // delete existing key
              tempRuleSetMap.set(change.value, rule); // add new key and value
            }
          } else {
            // update the rule object in map
            tempRuleSetMap.set(event.detail.rule, rule);
          }
        }
      }
    }

    // trigger change for LWC framework to recognise
    this.pvtRulesMap = tempRuleSetMap;

    const rules = Array.from(this.pvtRulesMap.values());
    this.fireChangeEvent("rules", rules);
  }

  /**
   * Fire the change event to notify parent component
   * @param {*} field
   * @param {*} value
   */
  fireChangeEvent(field, value) {
    const editEvent = new CustomEvent("edit", {
      detail: { rule: this.ruleName, change: { field, value } }
    });
    this.dispatchEvent(editEvent);
  }

  deleteHandler() {
    // fire delete event
    const deleteEvent = new CustomEvent("delete", {
      detail: { rule: this.ruleName }
    });
    this.dispatchEvent(deleteEvent);
  }

  addCriteriaHandler() {
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const criterias = JSON.parse(JSON.stringify(this.pvtCriterias));
    if (criterias.filter((criteria) => criteria.criteria === "").length > 0) {
      this.showNotification(
        "Error",
        "One blank criteria already exist",
        "error"
      );
      return;
    }
    criterias.push({
      order: (this.pvtCriterias.length || 0) + 1,
      criteria: "",
      type: "start"
    });
    // trigger change for LWC framework to recognise
    this.pvtCriterias = criterias;
    this.fireChangeEvent("criterias", this.pvtCriterias);
  }

  editCriteriaHandler(event) {
    event.stopPropagation();
    // trigger change for LWC framework to recognise
    const criterias = JSON.parse(JSON.stringify(this.pvtCriterias));

    criterias.forEach((criteria) => {
      if (criteria.criteria === event.detail.name) {
        // get the change
        const { field, value } = event.detail.change;
        criteria[field] = value;
      }
    });
    // trigger change for LWC framework to recognise
    this.pvtCriterias = criterias.sort((a, b) => a.order - b.order);
    this.fireChangeEvent("criterias", this.pvtCriterias);
  }

  deleteCriteriaHandler(event) {
    event.stopPropagation();
    // work with a duplicate copy, a hack to notify lwc framework about changes
    const criterias = JSON.parse(JSON.stringify(this.pvtCriterias));
    const index = criterias.findIndex(
      (criteria) => criteria.criteria === event.detail.name
    );
    criterias.splice(index, 1);
    // trigger change for LWC framework to recognise
    this.pvtCriterias = criterias;
    this.fireChangeEvent("criterias", this.pvtCriterias);
  }

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

  get selectedCase() {
    return this.caseSensitive ? "yes" : "no";
  }

  get ruleTypes() {
    return [
      { label: "Single", value: "single" },
      { label: "Nested", value: "nested" },
      { label: "Default", value: "default" }
    ];
  }

  get actionOptions() {
    return [
      { label: "Execute Apex", value: "apex" },
      { label: "Return A Value", value: "return" }
    ];
  }

  get successOptions() {
    return [
      { label: "Execute Next", value: "next" },
      { label: "Stop", value: "stop" }
    ];
  }

  get failureOptions() {
    return [
      { label: "Execute Next", value: "next" },
      { label: "Stop", value: "stop" }
    ];
  }

  get isNested() {
    return this.ruleType === "nested";
  }

  get isDefault() {
    return this.ruleType === "default";
  }
}
