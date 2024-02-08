<?php

// Cypress testing config
define('RG_BASE_DIRECTORY', '//localhost');

// path is relative to RG_BASE_DIRECTORY
define('OVERRIDE_KARTAT_DIRECTORY', '../rg2/kartat/');

// location of Splitsbrowser files if required: see Wiki for details of how to install Splitsbrowser

define('SPLITSBROWSER_DIRECTORY', 'https://www.routegadget.co.uk/splitsbrowser');

// default language if not English: this is overridden if the query includes a language (e.g. ?lang=fi)
// requires a dictionary file xx.js in the lang directory
define('START_LANGUAGE', 'en');

// Set encoding for input data default UTF-8
define('RG_INPUT_ENCODING', 'UTF-8');

// text displayed at bottom of info dialog. Use '' to leave blank.
// OS licence text below is neeeded for installations on routegadget.co.uk site.
define('ADDITIONAL_INFO_TEXT', 'Maps published on this web site that contain OS data by permission of Ordnance Survey® Licence Number 100046745.');
