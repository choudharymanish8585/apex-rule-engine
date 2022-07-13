import { LightningElement, api, wire, track } from "lwc";
import getSobjects from "@salesforce/apex/re_MainController.getSobjects";

export default class RateCardCriterias extends LightningElement {
  // map<name,criteria>
  @api criterias;
  @api saveDisabled = false;
  @api isEdited = false;
  @track selectedObject;

  @wire(getSobjects) sobjects;

  handleObjectChange(event) {
    this.selectedObject = event.detail.value;
  }

  /**
   * Add new criteria with default values
   */
  addNewCriteriaHandler() {
    // fire add criteria event
    const addCriteriaEvent = new CustomEvent("new");
    this.dispatchEvent(addCriteriaEvent);
  }

  /**
   * Update criteria map based when
   * criteria property changes
   * @param {*} event
   */
  criteriaChangeHandler({ detail }) {
    // fire criteria change event
    const criteriaChangeEvent = new CustomEvent("edit", {
      detail
    });
    this.dispatchEvent(criteriaChangeEvent);
  }

  /**
   * delete the criteria from the map
   * @param {*} event
   */
  criteriaDeleteHandler({ detail }) {
    // fire delete criteria event
    const deleteCriteriaEvent = new CustomEvent("delete", {
      detail
    });
    this.dispatchEvent(deleteCriteriaEvent);
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

  get allCriterias() {
    // return sorted criteria list
    if (this.criterias) {
      const allCriterias = new Map([...this.criterias.entries()].sort());
      return allCriterias.values();
    }
    return [];
  }

  get objects() {
    return this.sobjects?.data?.map((item) => {
      return { label: item, value: item };
    });
  }
}
