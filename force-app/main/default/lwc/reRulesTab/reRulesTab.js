import { LightningElement, api } from "lwc";

export default class ReRulesTab extends LightningElement {
  @api ruleSets; // map of rulesets
  @api saveDisabled = false;
  @api isEdited = false;

  addNewRulesSetHandler() {
    // fire event to add new ruleset
    const addNewRulesSetEvent = new CustomEvent("new");
    this.dispatchEvent(addNewRulesSetEvent);
  }

  addNewRuleHandler({ detail }) {
    // fire event to add new rule
    const addNewRuleEvent = new CustomEvent("newrule", { detail });
    this.dispatchEvent(addNewRuleEvent);
  }

  deleteRuleHandler({ detail }) {
    // fire event to delete rule
    const deleteEvent = new CustomEvent("ruledelete", { detail });
    this.dispatchEvent(deleteEvent);
  }

  paramsChangeHandler({ detail }) {
    // fire event to update param
    const paramsChangeEvent = new CustomEvent("paramschange", { detail });
    this.dispatchEvent(paramsChangeEvent);
  }

  ruleChangeHandler({ detail }) {
    // fire event to update rule
    const ruleChangeEvent = new CustomEvent("rulechange", { detail });
    this.dispatchEvent(ruleChangeEvent);
  }

  deleteRulesetHandler({ detail }) {
    // fire event to delete ruleset
    const deleteEvent = new CustomEvent("delete", { detail });
    this.dispatchEvent(deleteEvent);
  }

  cancelClickHandler() {
    // fire cancel event
    const cancelEvent = new CustomEvent("cancel");
    this.dispatchEvent(cancelEvent);
  }

  saveClickHandler() {
    // fire save event
    const saveEvent = new CustomEvent("save");
    this.dispatchEvent(saveEvent);
  }

  get allRuleSets() {
    // return sorted and deep copy ruleset list
    if (this.ruleSets) {
      const tmpMap = new Map();
      for (const [key, value] of this.ruleSets) {
        tmpMap.set(key, {
          ruleset: JSON.parse(JSON.stringify(value.ruleset)),
          rules: new Map([...value.rules])
        });
      }
      return tmpMap.values();
    }
    return [];
  }
}
