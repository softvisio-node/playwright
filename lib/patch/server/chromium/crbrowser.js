import browser from "playwright-core/lib/server/chromium/crBrowser.js";

browser["CRBrowser"] = class extends browser.CRBrowser {
    __userAgent = "";

    static async connect ( transport, options, devtools ) {
        const browser = await super.connect( transport, options, devtools );

        const session = browser._session;

        const version = await session.send( "Browser.getVersion" );

        browser.__userAgent = version.userAgent;

        return browser;
    }
};
