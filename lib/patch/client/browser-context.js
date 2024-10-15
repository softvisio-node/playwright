import browserContext from "playwright-core/lib/client/browserContext.js";
import Cookie from "#core/http/cookie";
import Cookies from "#core/http/cookies";

browserContext.BrowserContext = class extends browserContext.BrowserContext {

    // public
    async getHttpCookies () {
        const cookies = new Cookies(),
            remoteCookies = await this.cookies();

        for ( const cookie of remoteCookies ) {
            let url;

            if ( cookie.domain.startsWith( "." ) ) {
                url = ( cookie.secure
                    ? "https:"
                    : "http:" ) + "//" + cookie.domain.slice( 1 ) + "/";
            }
            else {
                url = ( cookie.secure
                    ? "https:"
                    : "http:" ) + "//" + cookie.domain + "/";

                delete cookie.domain;
            }

            if ( cookie.expires ) {

                // session cookie
                if ( cookie.expires < 0 ) {
                    cookie.expires = null;
                }
                else {
                    cookie.expires = Math.floor( cookie.expires * 1000 );
                }
            }

            cookies.add( url, [ new Cookie( cookie ) ] );
        }

        return cookies;
    }
};
