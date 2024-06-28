import page from "playwright-core/lib/client/page.js";
import Cookies from "#core/http/cookies";

page.Page = class extends page.Page {
    #imagesIsDisabled = false;

    // properties
    get imagesIsDisabled () {
        return this.#imagesIsDisabled;
    }

    // public
    async disableImages () {
        if ( this.#imagesIsDisabled ) return;

        this.#imagesIsDisabled = true;

        return this.route( "**", ( route, request ) => {
            if ( request.resourceType() === "image" ) route.abort();
            else route.continue();
        } );
    }

    // XXX expires
    async getHttpCookies () {
        const cookies = new Cookies(),
            url = this.url(),
            remoteCookies = await this.context().cookies( url );

        cookies.add(
            remoteCookies.map( cookie => {
                delete cookie.expires;

                return cookie;
            } ),
            url
        );

        return cookies;
    }
};
