import dispatcher from "playwright-core/lib/dispatchers/dispatcher.js";

dispatcher.Dispatcher = class extends dispatcher.Dispatcher {
    constructor ( parent, object, type, initializer ) {
        if ( type === "Browser" ) initializer.userAgent = object.__userAgent;

        super( ...arguments );
    }
};
