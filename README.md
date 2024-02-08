# Routegadget 2

## Latest news

This branch is Version 2.0 and will become the supported version. The functionality should be very familiar but the user interface is a lot nicer.

## Development notes

npm install to make sure you have all necessary dependencies installed. The project uses Vite and Rollup, with Cypress for testing.

npm run dev : this starts a vite development server which includes hot module reload.

You need to be running a separate server to manage the API calls. At present this is assumed to be XAMPP or similar. In future I guess there should be a way of doing this in node.

You should now be able to access rg2 at http://localhost/rg2/

## Cypress tests

npm run test starts vite with code coverage enabled

You still need the XAMPP server for the API.

In a separate terminal window:

npm run cypress to start the Cypress test environment and run test scripts individually

npm run test:all to run the full suite of tests automatically

Test coverage results are in coverage/lcov-report/index.html

## Building for a release

The version number is taken from package.json.

npm run upver takes the package.json version number and puts it in config.js, index.php and rg2api.php.

npm run build does the version number update and then runs a full production build. Output goes to the dist directory.

## Installing

For a standard installation sync the dist directory to your rg2 directory on the production server. The only missing file should be the rg2-config.php file which you need to set up separately based on rg2-config.txt.

## Siteground configuration for routegadget.co.uk

You need to disable the dynamic cache. At the moment this is done by setting header('Cache-Control: no-cache'); in index.php which turns off caching of the entry file for all installations which is probably a good thing given the trouble it was causing.

Each club installation is in a subdomain (e.g. www.happyherts.co.uk). The config file contains:

```
define('RG_BASE_DIRECTORY', 'https://www.happyherts.routegadget.co.uk');
define('OVERRIDE_SOURCE_DIRECTORY', 'https://www.routegadget.co.uk');
```

This needs a CORS request for the js files. To allow this the routegadget.co.uk .htaccess file contains

```
# Sets CORS headers for requests from routegadget subdomains
# see https://gist.github.com/brianlmoon/2291111c5c69252c85f4

SetEnvIf Origin "^(https:\/\/www\.(.*)\.routegadget.co.uk)$" ORIGIN=$0
Header always set Access-Control-Allow-Origin %{ORIGIN}e env=ORIGIN
Header set Access-Control-Allow-Credentials "true" env=ORIGIN
Header merge Vary Origin
```

You also need to disable nginx direct delivery for this to work, since otherwise these .htaccess rules are ignored.

## Installing on routegadget.co.uk

Sync dist/assets to www.routegadget.co.uk/rg2/assets

npm run deploy will recreate the necessary directory structure for all subdomains under website. This can then be synced.

## User Guides and Introductory Videos

The [Routegadget UK site](https://www.routegadget.co.uk) has a full User Guide.

[All RG2 videos.](http://screencast-o-matic.com/channels/c2e22vhJZ)

For a quick start try:

1. The [User Guide](https://www.routegadget.co.uk/docs/intro/).

2. Video: [A quick introduction to RG2](http://screencast-o-matic.com/u/VJsd/RG2-Quick-Introduction)

3. Video: [Drawing a route](http://screencast-o-matic.com/u/VJsd/RG2-Draw-A-Route)

4. Video: [Uploading a GPS route](http://screencast-o-matic.com/u/VJsd/RG2-GPS-Upload)

## Manager Guide and Video

- [Manager guide](https://github.com/Maprunner/rg2/wiki/Manager-details)

  - [Installation](https://github.com/Maprunner/rg2/wiki/Installation)
  - [Splitsbrowser integration](https://github.com/Maprunner/rg2/wiki/Splitsbrowser-integration)
  - [Language configuration](https://github.com/Maprunner/rg2/wiki/Language-configuration)
  - [Map files](https://github.com/Maprunner/rg2/wiki/Map-files)
  - [Georeferencing](https://github.com/Maprunner/rg2/wiki/Georeferencing-maps)

- Video: [A quick introduction to RG2 manager functions](http://screencast-o-matic.com/u/VJsd/RG2-Cassiobury-Manager-Demo)

- Video: [Georeferencing your map in RG2](http://screencast-o-matic.com/u/VJsd/Georeferencing)

## What is RouteGadget?

Routegadget is a Web application for drawing and comparing orienteering routes. The original version was developed by Jarkko Ryyppö, and it is now used by orienteering clubs around the world.

## Why Routegadget 2?

The original Routegadget makes extensive use of Java, and this has caused increasing difficulties.
Routegadget 2 allows you to view existing Routegadget information in any modern (HTML5-compliant) browser without the need for Java. It also adds a modern user interface as well as updated functionality for analysis.

## RG2 Installations

For a list of known RG2 installations see the [RG2 statistics database](http://www.maprunner.co.uk/rg2-stats). Email me if you would like your site added to this list.
