import page from "playwright-core/lib/client/page.js";

page.Page = class extends page.Page {
    #imagesIsDisabled = false;

    get imagesIsDisabled () {
        return this.#imagesIsDisabled;
    }

    async disableImages () {
        if ( this.#imagesIsDisabled ) return;

        this.#imagesIsDisabled = true;

        return this.route( "**", ( route, request ) => {
            if ( request.resourceType() === "image" ) route.abort();
            else route.continue();
        } );
    }
};
