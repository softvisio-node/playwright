import * as config from "#core/config";
import { getRandomWeight, getRandomArrayValue } from "#core/utils";

const DEVICES = config.read( "#resources/devices.yaml", { "resolve": import.meta.url } );

const TAGS = {};

// build tags index
for ( const id in DEVICES.devices ) {
    const device = DEVICES.devices[id];

    device.id = id;

    TAGS[id] ??= [];
    TAGS[id].push( device );

    device.tags.forEach( tag => {
        TAGS[tag] ??= [];
        TAGS[tag].push( device );
    } );
}

export default function getDevice ( tags ) {
    const items = {};

    if ( !tags ) tags = { "windows": 100 };
    else if ( typeof tags === "string" ) tags = { [tags]: 100 };

    for ( const tag in tags ) {
        const devices = TAGS[tag];

        if ( !devices ) continue;

        devices.forEach( device => {
            items[device.id] ??= { "id": device.id, "weight": 0 };
            items[device.id].weight += tags[tag] / devices.length;
        } );
    }

    const item = getRandomWeight( Object.values( items ) );

    if ( !item ) return;

    const device = { ...TAGS[item.id][0] };

    if ( !device.viewport ) {
        const screen = getRandomArrayValue( DEVICES.desktop_resolutions );

        device.screen = { ...screen };

        device.viewport = { "width": screen.width - 10, "height": screen.height - 98 };
    }

    return device;
}
