const { "default": dispatcher } = await import( new URL( "lib/server/dispatchers/dispatcher.js", import.meta.resolve( "playwright-core" ) ) );

dispatcher.Dispatcher = class Dispatcher extends dispatcher.Dispatcher {
    constructor ( parent, object, type, initializer, isScope ) {
        if ( type === "Browser" && object._userAgent ) initializer.userAgent = object._userAgent;

        super( parent, object, type, initializer, isScope );
    }
};
