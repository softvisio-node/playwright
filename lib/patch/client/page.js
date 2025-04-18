import Cookie from "#core/http/cookie";
import Cookies from "#core/http/cookies";

const { "default": page } = await import( new URL( "lib/client/page.js", import.meta.resolve( "playwright-core" ) ) );

Object.defineProperties( page.Page.prototype, {
    "_imagesIsDisabled": {
        "value": false,
    },

    // properties
    "imagesIsDisabled": {
        get () {
            return this._imagesIsDisabled;
        },
    },

    // public
    "disableImages": {
        async value () {
            if ( this._imagesIsDisabled ) return;

            this._imagesIsDisabled = true;

            return this.route( "**", ( route, request ) => {
                if ( request.resourceType() === "image" ) route.abort();
                else route.continue();
            } );
        },
    },

    "getHttpCookies": {
        async value () {
            const cookies = new Cookies(),
                url = this.url(),
                remoteCookies = await this.context().cookies( url );

            cookies.add(
                url,
                remoteCookies.map( cookie => {
                    if ( !cookie.domain.startsWith( "." ) ) {
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

                    return new Cookie( cookie );
                } )
            );

            return cookies;
        },
    },
} );
