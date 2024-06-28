import browserContext from "playwright-core/lib/client/browserContext.js";
import Cookies from "#core/http/cookies";

browserContext.BrowserContext = class extends browserContext.BrowserContext {

    // public
    async getHttpCookies () {
        const cookies = new Cookies(),
            remoteCookies = await this.cookies();

        cookies.add( remoteCookies.map( cookie => {
            if ( cookie.expires ) {

                // session cookie
                if ( cookie.expires < 0 ) {
                    cookie.expires = null;
                }
                else {
                    cookie.expires = Math.floor( cookie.expires * 1000 );
                }
            }

            return cookie;
        } ) );

        return cookies;
    }
};
