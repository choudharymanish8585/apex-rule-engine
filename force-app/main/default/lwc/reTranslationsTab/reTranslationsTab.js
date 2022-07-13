/* eslint-disable no-unused-expressions */
import { LightningElement, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getConfig from "@salesforce/apex/re_MainController.getConfig";

export default class RateCardTranslation extends LightningElement {
  @api currentConfigId;
  config;
  ruleSetMap;
  criteriaMap;
  param;
  params;
  translations;

  connectedCallback() {
    this.fetchConfig();
  }

  init() {
    // mutate the objects first for modification
    const tempConfig = JSON.parse(JSON.stringify(this.config));
    // get the rule sets
    this.ruleSetMap = this.buildRuleSetMap(tempConfig.rules);
    // build criteria map
    this.criteriaMap = this.buildMap(tempConfig.criterias);
  }

  buildRuleSetMap(ruleSets) {
    const rsMap = new Map();
    const params = [];
    if (ruleSets && ruleSets.length) {
      ruleSets.forEach((element) => {
        element.appliedTo.forEach((param) => {
          element.rules && this.sort(element.rules);
          rsMap.set(param, element.rules);
          params.push({ label: param, value: param });
        });
      });
    }
    this.params = params;
    return rsMap;
  }

  fetchConfig() {
    getConfig({ configIdOrName: this.currentConfigId })
      .then((response) => {
        if (!response) {
          this.showNotification("Error", "No config found", "error");
        }
        this.config = JSON.parse(response);
        this.init();
      })
      .catch((error) => {
        // throw error, name cannot be blank
        this.showNotification("Error", "Could not retrieve config", "error");
        console.error(error);
      });
  }

  paramChangeHandler(event) {
    this.param = event.target.value;
  }

  translateHandler() {
    const rules = this.ruleSetMap.get(this.param);
    if (rules) {
      this.translations = `<h2>Translation For Param: ${this.param}</h2><br/><p><ol>`;
      for (const rule of rules) {
        this.translateRule(rule);
      }
      this.translations += `</ol></p>`;
    } else {
      this.showNotification(
        "No ruleset found",
        `Param ${this.param} does not have any ruleset confuguration`,
        "error"
      );
    }
  }

  translateRule(rule) {
    if (rule.rules && rule.rules.length) {
      this.translations += `<li><strong>If- [</strong>`;
      if (rule.criterias) {
        for (const rc of rule.criterias) {
          this.translations +=
            rc.type !== "start" ? `    <strong>${rc.type}</strong>    ` : "";
          const criteria = this.criteriaMap.get(rc.criteria);
          if (criteria) {
            this.translations += `${criteria.field} ${
              criteria.comparison === "equals"
                ? "<strong>equals to</strong>"
                : "<strong>contains</strong>"
            } ${criteria.value}`;
          }
        }
        this.translations += `<strong>];</strong> Then <ol>`;
      }
      for (const subRule of rule.rules) {
        this.translateRule(subRule);
      }
      this.translations += `</ol>`;
    } else {
      if (rule.criterias) {
        this.translations += this.getActionLabel(rule);

        for (const rc of rule.criterias) {
          this.translations +=
            rc.type !== "start" ? `    <strong>${rc.type}</strong>    ` : "";
          const criteria = this.criteriaMap.get(rc.criteria);
          if (criteria) {
            this.translations += `${criteria.field} ${
              criteria.comparison === "equals"
                ? "<strong>equals to</strong>"
                : "<strong>contains</strong>"
            } ${criteria.value}`;
          }
        }
        this.translations += "<strong>];</strong> ";
        this.translations += `${
          rule.success === "stop"
            ? " Stop on success, "
            : " Execute next on success, "
        }`;
        this.translations += `${
          rule.fail === "stop"
            ? "and stop on fail."
            : "and execute next on fail."
        } </li>`;
      }
    }
  }

  getActionLabel(rule) {
    switch (rule.action) {
      case "apex":
        return `<li><strong>Execute Apex Method</strong> "${rule.actionValue}"<strong>; IF- [</strong>`;
      case "return":
        return `<li><strong>Return Value</strong> "${rule.actionValue}"<strong>; IF- [</strong>`;
      default:
        return "";
    }
  }

  sort(rules) {
    rules.sort((a, b) => {
      return a.order - b.order;
    });
    for (const rule of rules) {
      // sort criterias
      rule.criterias &&
        rule.criterias.sort((a, b) => {
          return a.order - b.order;
        });

      // sort rules
      rule.rules && this.sort(rule.rules);
    }
  }

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
