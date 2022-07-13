import { LightningElement, api } from "lwc";

export default class RateCardRuleCriteria extends LightningElement {
  @api order;
  @api name;
  @api type = "start";

  handleOrderChange(e) {
    const order = e.target.value;
    this.fireChangeEvent("order", order);
  }

  handleNameChange(e) {
    const name = e.target.value;
    this.fireChangeEvent("criteria", name);
  }

  handleTypeChange(e) {
    const type = e.target.value;
    this.fireChangeEvent("type", type);
  }

  deleteHandler() {
    const deleteEvent = new CustomEvent("delete", {
      detail: { name: this.name }
    });
    this.dispatchEvent(deleteEvent);
  }

  /**
   * Fire the change event to notify parent component
   * @param {*} field
   * @param {*} value
   */
  fireChangeEvent(field, value) {
    const editEvent = new CustomEvent("edit", {
      detail: { name: this.name, change: { field, value } }
    });
    this.dispatchEvent(editEvent);
  }
  get criteriaType() {
    return [
      { label: "Start", value: "start" },
      { label: "OR", value: "OR" },
      { label: "AND", value: "AND" }
    ];
  }

  get criterias() {
    let allCriterias = [];
    try {
      allCriterias = JSON.parse(sessionStorage.getItem("criterias"));
    } catch (e) {
      console.error("No criterias found--", e);
    }
    return allCriterias;
  }
}
