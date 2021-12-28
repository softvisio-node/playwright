import playwright from "playwright-core";
import getDevice from "#lib/devices";

playwright.getDevice = getDevice;

export default playwright;
