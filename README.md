# Routegadget 2

## Latest news
Version 0.8.0 was released on 24 May 2014 and has been installed on all routegadget.co.uk sites. This includes integration with the new javascript version of Splitsbrowser, as well as several user interface modifications and performance enhancements. You can now see event statistics (including all user comments) on the About dialog. This version may also have solved the drag/click problem when using a wireless mouse to draw routes, but since my mouse doesn't seem to have the problem I'm not sure yet.

## User Guide and Introductory Videos

For a quick start try:

1. The [User Guide] (https://github.com/Maprunner/rg2/wiki/User-guide) in the wiki.
 
2. Video: [A quick introduction to RG2] (http://screencast-o-matic.com/u/VJsd/RG2-Quick-Introduction)

3. Video: [Drawing a route] (http://screencast-o-matic.com/u/VJsd/RG2-Draw-A-Route)

4. Video: [Uploading a GPS route] (http://screencast-o-matic.com/u/VJsd/RG2-GPS-Upload)

5. Video: [A quick introduction to RG2 manager functions] (http://screencast-o-matic.com/u/VJsd/RG2-Cassiobury-Manager-Demo)

## What is RouteGadget?
Routegadget is a Web application for drawing and comparing orienteering routes. The original version was developed by Jarkko Ryyppö, and
it is now used by [orienteering clubs around the world] (http://www.routegadget.net). This includes a very big user base
in [Great Britain] (http://www.routegadget.co.uk/). 

You can see RG2 in action on the [Hertfordshire Orientering Club Routegadget 2 site] (http://www.happyherts.routegadget.co.uk/rg2/index.php).

## Why Routegadget 2?
The original Routegadget makes extensive use of Java, and this has caused increasing difficulties.
Routegadget 2 allows you to view existing Routegadget information in any modern (HTML5-compliant) browser without the need for Java.
It also adds a modern user interface as well as updated functionality for analysis.

##Installation
To use Routegadget 2 you need to install it in an existing Routegadget installation. This will require ftp access to your server. If this makes no sense then the following information is not for you.

1. Download the [files] (https://github.com/Maprunner/rg2/archive/master.zip) and extract them. Note that this will extract them to a directory called rg-master, which needs to be renamed to rg2.

2. Rename the rg2-config.txt file to rg2-config.php in the /rg2 directory and enter the URL for your existing Routegadget installation. Change other configuration options as necessary.
 
3. Use ftp to transfer them to your Routegadget server. Everything sits in or below a new directory called rg2 which is in the main Routegadget
directory, at the same level as the kartat directory where the data files are stored. You should end up with a structure similar to:

         www.club.routegadget.co.uk
             /cgi-bin
             /html
             /img
             /kartat
             /rg2
                 /css
                 /img
                 /lock
                 /log
                 /js
                     /lib

4. Your data should now be available at e.g. http://www.club.routegadget.co.uk/rg2/index.php


