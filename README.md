# Routegadget 2

## Latest news

1 July 2025: Version 2.2.1 released. Minor enhancements and error corrections. Excluded leg details now shown in info dialog. Events with courses and results but no splits (Sprintelope type) now allow drawing and replay.

14 June 2025: Version 2.2.0 released. The main change is the new speed analysis functionality that has been added to the performance analysis tabs.

26 September 2024: Version 2.1 released as the main branch. This is the latest update of what has been running on routegadget.co.uk for the past year.

Version 1.x has now been archived and is on the Version-1-archive branch. It is not intended to support this any further.

## Installing
If all you want to do is install a working version on your own server then there is no need to install a local development version.

Download the zip file and sync the /dist directory to your /rg2 directory on the production server. The only missing file should be the rg2-config.php file which you need to set up separately based on rg2-config.txt. [See the wiki](https://github.com/Maprunner/rg2/wiki/Installation) for further details.

## Development notes

```
npm install
```

to make sure you have all necessary dependencies installed. The project uses Vite and Rollup, with Cypress for testing.

```
npm run dev
```

This starts a vite development server which includes hot module reload. You need to be running a separate server to manage the API calls. At present this is assumed to be XAMPP or similar. In future I guess there should be a way of doing this in node.

You should now be able to access rg2 at http://localhost/rg2/

## Cypress tests

```
npm run test
```

Starts vite with code coverage enabled. You still need the XAMPP server for the API. In a separate terminal window:

```
npm run cypress
```

Start the Cypress test environment and allows you to run test scripts individually.

```
npm run test:all
```

Runs the full suite of tests automatically. Test coverage results are in coverage/lcov-report/index.html

## Building for a release

The version number is taken from package.json. This needs to be updated manually.

```
npm run upver
```

This takes the package.json version number and puts it in config.js, index.php and rg2api.php.

```
npm run build
```

Does the version number update and then runs a full production build. Output goes to the dist directory.

## PHP versions

This release requires PHP version 8. The routegadget.co.uk site is currently running with 8.2.23.

RG2 uses the mbstring extension to support multibyte strings. This is not a default PHP extension and [must be explicitly enabled in your configuration file](https://www.php.net/manual/en/mbstring.installation.php). 

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

```
npm run deploy
```

This creates the necessary directory structure for all subdomains in the /website folder. This can then be synced to the server.

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

```

```
