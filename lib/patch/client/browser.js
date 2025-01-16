import { createPageShim } from "playwright-extra/dist/puppeteer-compatiblity-shim/index.js";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import ProxyClient from "#core/net/proxy";

// init stealth plugin
const PLUGINS = [];

for ( const dependency of stealthPlugin().dependencies ) {
    const { "default": plugin } = await import( "puppeteer-extra-plugin-" + dependency + "/index.js" );

    PLUGINS.push( plugin );
}

const { "default": browser } = await import( new URL( "lib/client/browser.js", import.meta.resolve( "playwright-core" ) ) );

browser.Browser = class extends browser.Browser {

    // public
    // XXX
    async newContext ( { device, ...options } = {} ) {

        // make a copy
        options = { ...options };

        // apply device settings
        if ( device ) {
            options = { ...device, ...options };
        }

        // "viewport" can't be null if "deviceScaleFactor" is specified
        if ( options.deviceScaleFactor && options.viewport === null ) delete options.viewport;

        // patch proxy
        if ( typeof options.proxy === "string" ) {
            options.proxy = await ProxyClient.new( options.proxy ).getPlaywrightProxy();
        }
        else if ( options.proxy instanceof ProxyClient ) {
            options.proxy = await options.proxy.getPlaywrightProxy();
        }

        const ctx = await super.newContext( options );

        // XXX
        // ctx.on( "page", async page => {

        // } );

        return ctx;
    }

    async newPage ( options ) {
        const page = await super.newPage( options );

        await page.goto( "about:blank" );
        await this.#applyStealth( page, options );

        return page;
    }

    // private
    // XXX
    async #applyStealth ( page, options ) {

        // init stealth plugin
        const evasions = [];
        for ( const plugin of PLUGINS ) {
            evasions.push( plugin() );
        }

        page = createPageShim( page );

        for ( const evasion of evasions ) {
            await evasion.onPageCreated( page );
        }
    }
};
