const dispatcher = require( "playwright-core/lib/dispatchers/dispatcher" );

dispatcher.Dispatcher = class extends dispatcher.Dispatcher {
    constructor ( parent, object, type, initializer ) {
        if ( type === "Browser" ) initializer.userAgent = object.__userAgent;

        super( ...arguments );
    }
};
