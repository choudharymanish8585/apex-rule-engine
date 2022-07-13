import { LightningElement, api, wire } from "lwc";
import { getObjectInfo } from "lightning/uiObjectInfoApi";

export default class RateCardCriteria extends LightningElement {
  @api criteriaValue;
  @api criteriaName;
  @api fieldApiName;
  @api comparisonType = "equals"; // default value
  @api caseSensitive = false; // default value
  @api selectedObject; // default value

  @wire(getObjectInfo, { objectApiName: "$selectedObject" })
  selectedObjectInfo;

  handleNameChange(e) {
    const criteriaName = e.target.value;
    this.fireChangeEvent("name", criteriaName.trim());
  }
  handleFieldChange(e) {
    const fieldApiName = e.target.value;
    this.fireChangeEvent("field", fieldApiName.trim());
  }
  handleValueChange(e) {
    const criteriaValue = e.target.value;
    this.fireChangeEvent("value", criteriaValue.trim());
  }
  handleCaseChange(e) {
    const criteriaCase = e.target.value;
    this.fireChangeEvent("considerCase", criteriaCase.trim());
  }
  handleComparisonChange(e) {
    const criteriaComparison = e.target.value;
    this.fireChangeEvent("comparison", criteriaComparison.trim());
  }

  /**
   * Fire the change event to notify parent component
   * @param {*} field
   * @param {*} value
   */
  fireChangeEvent(field, value) {
    const editEvent = new CustomEvent("edit", {
      detail: { criteria: this.criteriaName, change: { field, value } }
    });
    this.dispatchEvent(editEvent);
  }

  deleteHandler() {
    // fire delete event
    const deleteEvent = new CustomEvent("delete", {
      detail: this.criteriaName
    });
    this.dispatchEvent(deleteEvent);
  }

  get selectedCase() {
    return this.caseSensitive ? "yes" : "no";
  }

  get comparisons() {
    return [
      { label: "Equals", value: "equals" },
      { label: "Contains", value: "contains" },
      { label: "Greater than", value: "higher" },
      { label: "Less than", value: "less" }
    ];
  }

  get caseSensitiveOptions() {
    return [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" }
    ];
  }

  get fields() {
    // add pre-filled fields in config to combobox
    // this helps in avoilding blank combobox if user has not selected any object
    const selectedObjectFields = [{ label: this.fieldApiName, value: this.fieldApiName }];
    for (let field in this.selectedObjectInfo?.data?.fields) {
      if (this.fieldApiName !== field) {
        selectedObjectFields.push({ label: field, value: field });
      }
    }
    return selectedObjectFields;
  }
}
