import playwright from "playwright-core";
import { addExtra } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import getDevice from "#lib/devices";

playwright.getDevice = getDevice;

playwright.chromium = addExtra( playwright.chromium );
playwright.chromium.use( stealthPlugin() );

export default playwright;
