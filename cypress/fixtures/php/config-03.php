<?php

// Cypress testing config
define('RG_BASE_DIRECTORY', '//localhost');

// path is relative to RG_BASE_DIRECTORY
define('OVERRIDE_KARTAT_DIRECTORY', '../rg2/kartat/');

// location of Splitsbrowser files if required: see Wiki for details of how to install Splitsbrowser

define('SPLITSBROWSER_DIRECTORY', 'https://www.routegadget.co.uk/splitsbrowser');

// default language if not English: this is overridden if the query includes a language (e.g. ?lang=fi)
// requires a dictionary file xx.js in the lang directory
define('START_LANGUAGE', 'fr');

// Set encoding for input data default UTF-8
define('RG_INPUT_ENCODING', 'UTF-8');

// text displayed at bottom of info dialog. Use '' to leave blank.
// OS licence text below is neeeded for installations on routegadget.co.uk site.
define('ADDITIONAL_INFO_TEXT', 'Maps published on this web site that contain OS data by permission of Ordnance Survey® Licence Number 100046745.');

// proj4 co-ordinate reference system for new maps
// see http://spatialreference.org/ref/epsg/ for master list
// see http://spatialreference.org/ref/epsg/27700/ for example of UK National Grid
// select "proj4" in the list see http://spatialreference.org/ref/epsg/27700/proj4/ for example parameter string
//
// Note: EPSG:27700 is built in to RG2 as default so you do NOT need to declare it here: this is just an example
// EPSG:900913 (Google) is also built in
// Uncomment the following lines and edit for the required co-ordinate system(s).
// Use | to separate different systems if you need to add more than one.
//
define('EPSG_CODE', "EPSG:4326");
define('EPSG_PARAMS', "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs");
