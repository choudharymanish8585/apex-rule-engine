/* eslint-disable no-unused-expressions */
import { LightningElement, api } from "lwc";

export default class RateCardRules extends LightningElement {
  @api params;
  @api rules; // rules map
  @api ruleSetId;

  /**
   * Add new rule with default values
   */
  addNewRuleHandler(e) {
    e.stopPropagation();
    // fire add criteria event
    if (this.ruleSetId) {
      const addRuleEvent = new CustomEvent("new", { detail: this.ruleSetId });
      this.dispatchEvent(addRuleEvent);
    } else {
      const addRuleEvent = new CustomEvent("newnested");
      this.dispatchEvent(addRuleEvent);
    }
  }

  /**
   * delete rule set
   */
  deleteRuleSetHandler() {
    // fire delete ruleset event
    const deleteRuleSetEvent = new CustomEvent("rulesetdelete", {
      detail: this.ruleSetId
    });
    this.dispatchEvent(deleteRuleSetEvent);
  }

  paramsChangeHandler(event) {
    // fire param change event
    const paramsChangeEvent = new CustomEvent("paramschange", {
      detail: { ruleSetId: this.ruleSetId, params: event.target.value }
    });
    this.dispatchEvent(paramsChangeEvent);
  }

  /**
   * Update rule map based when
   * rule property changes
   * @param {*} event
   */
  ruleChangeHandler(event) {
    event.stopPropagation();
    // fire rule change event
    if (this.ruleSetId) {
      const ruleChangeEvent = new CustomEvent("rulechange", {
        detail: { ...event.detail, ruleSetId: this.ruleSetId }
      });
      this.dispatchEvent(ruleChangeEvent);
    } else {
      const ruleChangeEvent = new CustomEvent("nestedrulechange", {
        detail: { ...event.detail }
      });
      this.dispatchEvent(ruleChangeEvent);
    }
  }

  /**
   * delete the rule from the map
   * @param {*} event
   */
  ruleDeleteHandler(event) {
    event.stopPropagation();
    // fire rule delete event
    if (this.ruleSetId) {
      const ruleDeleteEvent = new CustomEvent("delete", {
        detail: { ...event.detail, ruleSetId: this.ruleSetId }
      });
      this.dispatchEvent(ruleDeleteEvent);
    } else {
      const ruleDeleteEvent = new CustomEvent("nestedruledelete", {
        detail: { ...event.detail }
      });
      this.dispatchEvent(ruleDeleteEvent);
    }
  }

  get allRules() {
    // return sorted rules map
    const allRules = new Map(
      [...this.rules.entries()].sort((a, b) => {
        return a[1].order - b[1].order;
      })
    );
    return allRules.values();
  }

  get appliesTo() {
    return this.params.toString();
  }

  get hasParams() {
    return this.params ? true : false;
  }

  get showDelete() {
    return this.ruleSetId;
  }
}
