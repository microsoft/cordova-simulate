// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple, https://github.com/apache/incubator-ripple

module.exports = {
    'COMMON': {
        'PREFIX': 'tinyhippos-',
    },

    'GEO': {
        'OPTIONS': {
            'LATITUDE': 'geo-latitude',
            'LONGITUDE': 'geo-longitude',
            'ALTITUDE': 'geo-altitude',
            'CELL_ID': 'geo-cellid',
            'ACCURACY': 'geo-accuracy',
            'ALTITUDE_ACCURACY': 'geo-altitude-accuracy',
            'HEADING': 'geo-heading',
            'SPEED': 'geo-speed',
            'TIME_STAMP': 'geo-timestamp',
            'DELAY': 'geo-delay',
            'DELAY_LABEL': 'geo-delay-label',
            'HEADING_LABEL': 'geo-heading-label',
            'HEADING_MAP_LABEL': 'geo-map-direction-label',
            'IMAGE': 'geo-map-img',
            'MAP_MARKER': 'geo-map-marker',
            'MAP_CONTAINER': 'geo-map-container',
            'TIMEOUT': 'geo-timeout',
            'GPXFILE': 'geo-gpxfile',
            'GPXGO': 'geo-gpx-go',
            'GPXMULTIPLIER': 'geo-gpxmultiplier-select',
            'GPXREPLAYSTATUS': 'geo-gpxreplaystatus'
        },
        'MAP_ZOOM_MAX': 18,
        'MAP_ZOOM_MIN': 0,
        'MAP_ZOOM_LEVEL_CONTAINER': 'geo-map-zoomlevel-value',
        'MAP_ZOOM_KEY': 'geo-map-zoom-key',
        'GPXGO_LABELS': {
            'GO': 'Go',
            'STOP': 'Stop'
        }
    },

    'BATTERY_STATUS': {
        'BATTERY_STATUS_KEY': 'battery-status-key',
        'IS_PLUGGED_KEY': 'is-plugged-key',
        'LEVEL_LABEL': 'battery-level-label',
        'LEVEL_VALUE': 'battery-level',
        'IS_PLUGGED_CHECKBOX': 'is-plugged'
    },
};
