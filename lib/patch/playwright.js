import playwright from "playwright-core";
import devices from "#lib/devices";

playwright.devices = devices;

export default playwright;
