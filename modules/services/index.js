<<<<<<< HEAD
//import CountryCoder from 'country-coder';

=======
>>>>>>> 247f20bf2a0cf483f232ebf7e29cafd63566e507
import serviceKeepRight from './keepRight';
import serviceImproveOSM from './improveOSM';
import serviceMapillary from './mapillary';
import serviceMapRules from './maprules';
import serviceNominatim from './nominatim';
import serviceOpenstreetcam from './openstreetcam';
import serviceOsm from './osm';
import serviceOsmWikibase from './osm_wikibase';
import serviceStreetside from './streetside';
import serviceTaginfo from './taginfo';
import serviceVectorTile from './vector_tile';
import serviceWikidata from './wikidata';
import serviceWikipedia from './wikipedia';


export var services = {
<<<<<<< HEAD
    countryCoder: null,//new CountryCoder(),
=======
>>>>>>> 247f20bf2a0cf483f232ebf7e29cafd63566e507
    geocoder: serviceNominatim,
    keepRight: serviceKeepRight,
    improveOSM: serviceImproveOSM,
    mapillary: serviceMapillary,
    openstreetcam: serviceOpenstreetcam,
    osm: serviceOsm,
    osmWikibase: serviceOsmWikibase,
    maprules: serviceMapRules,
    streetside: serviceStreetside,
    taginfo: serviceTaginfo,
    vectorTile: serviceVectorTile,
    wikidata: serviceWikidata,
    wikipedia: serviceWikipedia
};

export {
    serviceKeepRight,
    serviceImproveOSM,
    serviceMapillary,
    serviceMapRules,
    serviceNominatim,
    serviceOpenstreetcam,
    serviceOsm,
    serviceOsmWikibase,
    serviceStreetside,
    serviceTaginfo,
    serviceVectorTile,
    serviceWikidata,
    serviceWikipedia
};
