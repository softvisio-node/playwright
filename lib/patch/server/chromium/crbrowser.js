const browser = require( "playwright-core/lib/server/chromium/crBrowser" );

browser.CRBrowser = class extends browser.CRBrowser {
    __userAgent = "";

    static async connect ( transport, options, devtools ) {
        const browser = await super.connect( transport, options, devtools );

        const session = browser._session;

        const version = await session.send( "Browser.getVersion" );

        browser.__userAgent = version.userAgent;

        return browser;
    }
};
