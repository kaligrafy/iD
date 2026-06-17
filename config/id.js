/* eslint-disable no-undef */

/** Name in the OSM changeset `created_by` tag (upstream iD uses `iD`). */
const changesetEditorName = 'Chaire Mobilité iD';

/** GitHub Pages path to the legacy v5 editor (trailing slash). */
const legacyV5EditorPath = 'v5/';

/**
 * Predefined selectable UI themes. `url` points to a CSS file (relative to the
 * editor or absolute). Empty for now; theme application is not yet implemented.
 * @type {{ id: string, name: string, url: string }[]}
 */
const predefinedThemes = [];

/**
 * Street-level imagery providers shown in the entity editor location links.
 * `url` is a template with `{lat}`, `{lon}` and `{zoom}` placeholders. Custom
 * providers will be configurable later (like custom map backgrounds).
 * @type {{ id: string, name: string, url: string }[]}
 */
const streetLevelImagery = [
  {
    id: 'panoramax',
    name: 'Panoramax',
    url: 'https://api.panoramax.xyz/?focus=map&map={zoom}/{lat}/{lon}'
  },
  {
    id: 'mapillary',
    name: 'Mapillary',
    url: 'https://www.mapillary.com/app/?lat={lat}&lng={lon}&z={zoom}'
  }
];

// cdns for external data packages
const presetsCdnUrl = ENV__ID_PRESETS_CDN_URL
  || 'https://cdn.jsdelivr.net/npm/@openstreetmap/id-tagging-schema@{presets_version}/';
const ociCdnUrl = ENV__ID_OCI_CDN_URL
  || 'https://cdn.jsdelivr.net/npm/osm-community-index@{version}/';
const wmfSitematrixCdnUrl = ENV__ID_WMF_SITEMATRIX_CDN_URL
  || 'https://cdn.jsdelivr.net/npm/wmf-sitematrix@{version}/';
const nsiCdnUrl = ENV__ID_NSI_CDN_URL
  || 'https://cdn.jsdelivr.net/npm/name-suggestion-index@{version}/';

// api urls and settings
const defaultOsmApiConnections = {
  live: {
    url: 'https://www.openstreetmap.org',
    apiUrl: 'https://api.openstreetmap.org',
    client_id: '0tmNTmd0Jo1dQp4AUmMBLtGiD9YpMuXzHefitcuVStc'
  },
  dev: {
    url: 'https://api06.dev.openstreetmap.org',
    client_id: 'Ee1wWJ6UlpERbF6BfTNOpwn0R8k_06mvMXdDUkeHMgw'
  }
};
/** @type {{ url: string; apiUrl: string; client_id: string; }[]} */
const osmApiConnections = [];
if (ENV__ID_API_CONNECTION_URL !== null &&
    ENV__ID_API_CONNECTION_CLIENT_ID !== null) {
  // user specified API Oauth2 connection details
  // see https://wiki.openstreetmap.org/wiki/OAuth#OAuth_2.0_2
  osmApiConnections.push({
    url: ENV__ID_API_CONNECTION_URL,
    apiUrl: ENV__ID_API_CONNECTION_API_URL || ENV__ID_API_CONNECTION_URL,
    client_id: ENV__ID_API_CONNECTION_CLIENT_ID
  });
} else if (ENV__ID_API_CONNECTION !== null &&
  defaultOsmApiConnections[ENV__ID_API_CONNECTION] !== undefined) {
  // if environment variable ID_API_CONNECTION is either "live" or "dev":
  // only allow to connect to the respective OSM server
    osmApiConnections.push(defaultOsmApiConnections[ENV__ID_API_CONNECTION]);
} else {
  // offer both "live" and "dev" servers by default
  osmApiConnections.push(defaultOsmApiConnections.live);
  osmApiConnections.push(defaultOsmApiConnections.dev);
}

// auxiliary OSM services
const taginfoApiUrl = ENV__ID_TAGINFO_API_URL
  || 'https://taginfo.openstreetmap.org/api/4/';
const nominatimApiUrl = ENV__ID_NOMINATIM_API_URL
  || 'https://nominatim.openstreetmap.org/';

// support/donation message on upload success screen
const showDonationMessage = ENV__ID_SHOW_DONATION_MESSAGE !== 'false';

export {
  changesetEditorName,
  legacyV5EditorPath,
  predefinedThemes,
  streetLevelImagery,
  presetsCdnUrl,
  ociCdnUrl,
  wmfSitematrixCdnUrl,
  nsiCdnUrl,
  osmApiConnections,
  taginfoApiUrl,
  nominatimApiUrl,
  showDonationMessage
};
