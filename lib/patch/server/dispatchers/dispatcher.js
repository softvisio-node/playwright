const { "default": dispatcher } = await import( new URL( "lib/server/dispatchers/dispatcher.js", import.meta.resolve( "playwright-core" ) ) );

dispatcher.Dispatcher = class Dispatcher extends dispatcher.Dispatcher {
    constructor ( parent, object, type, initializer, gcBucket ) {
        if ( type === "Browser" && object._userAgent ) global[ Symbol.for( "playwright-user-agent" ) ] = object._userAgent;

        super( parent, object, type, initializer, gcBucket );
    }
};
