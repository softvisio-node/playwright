import browserContext from "playwright-core/lib/client/browserContext.js";
import Cookies from "#core/http/cookies";

browserContext.BrowserContext = class extends browserContext.BrowserContext {

    // public
    async getHttpCookies () {
        const cookies = new Cookies(),
            remoteCookies = await this.cookies();

        cookies.add( remoteCookies.map( cookie => {
            if ( cookie.expires === -1 ) {
                delete cookie.expires;
            }

            return cookie;
        } ) );

        return cookies;
    }
};
