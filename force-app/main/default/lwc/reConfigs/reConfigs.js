import { LightningElement, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getAllConfig from "@salesforce/apex/re_MainController.getAllConfig";

export default class ReConfigs extends LightningElement {
  configs = [];
  activeConfig;

  connectedCallback() {
    this.fetchAllConfigs();
  }

  @api
  refreshConfigList() {
    this.configs = [];
    this.fetchAllConfigs();
  }

  fetchAllConfigs() {
    getAllConfig()
      .then((result) => {
        this.configs = result;
      })
      .catch((error) => {
        this.showNotification("Error", error.message, "error");
      });
  }

  configClickHandler(event) {
    const id = event.detail.name;
    const name = event.detail.label;
    const configClickEvent = new CustomEvent("configclick", {
      detail: { id, name }
    });
    this.dispatchEvent(configClickEvent);
  }

  showNotification(title, message, variant) {
    const evt = new ShowToastEvent({
      title,
      message,
      variant
    });
    this.dispatchEvent(evt);
  }

  get showComponent() {
    return this.configs.length > 0;
  }
}
