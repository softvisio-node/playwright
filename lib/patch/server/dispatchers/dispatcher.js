import dispatchers from "playwright-core/lib/server/dispatchers/dispatcher.js";

dispatchers.Dispatcher = class extends dispatchers.Dispatcher {
    constructor ( parent, object, type, initializer, isScope ) {
        if ( type === "Browser" && object._userAgent ) initializer.userAgent = object._userAgent;

        super( parent, object, type, initializer, isScope );
    }
};
