# Routegadget 2.0

## Latest news
Version 0.6.0 was released on 7 March 2014 and has been installed on all routegadget.co.uk sites. The main change is the inclusion of Manager functionality to allow the creation of new events. For more details see the [wiki](https://github.com/Maprunner/rg2/wiki/Manager-details).

## What is RouteGadget?
Routegadget is a Web application for drawing and comparing orienteering routes. The original version was developed by Jarkko Ryyppö, and
it is now used by [orienteering clubs around the world] (http://www.routegadget.net). This includes a very big user base
in [Great Britain] (http://www.routegadget.co.uk/). 

If you are still lost then try:

* The original [Hertfordshire Orienteering Club Routegadget site] (http://www.happyherts.routegadget.co.uk/cgi-bin/reitti.cgi).
* The new [Hertfordshire Orientering Club Routegadget 2.0 site] (http://www.happyherts.routegadget.co.uk/rg2/index.php).

## Why Routegadget 2.0?
The original Routegadget makes extensive use of Java, and this has caused increasing difficulties.
Routegadget 2.0 allows you to view existing Routegadget information in any modern (HTML5-compliant) browser without the need for Java.
It also adds a modern user interface as well as updated functionality for analysis.

## GPS file adjustment
When you upload a file it is initially fitted to the course as closely as possible. Adjustment handles (small dots) are added at the start and end of the route. These are green when free to move and red when locked. Left click on a handle to toggle the lock. You can stretch and rotate around a single locked point, or between two locked points. In future the plan is to georeference maps and courses when they are added to RG2, and no adjustment will then be needed. 

##Installation
To use Routegadget 2.0 you need to install it in an existing Routegadget installation. This will require ftp access to your server. If this makes
no sense  then the following information is not for you.

1. Download the [files] (https://github.com/Maprunner/rg2/archive/master.zip) and extract them. Note that this will extract
them to a directory called rg-master, which needs to be renamed to rg2.

2. Use ftp to transfer them to your Routegadget server. Everything sits in or below a new directory called rg2 which is in the main Routegadget
directory, at the same level as the kartat directory where the data files are stored. You should end up with a structure similar to:

         www.club.routegadget.co.uk
             /cgi-bin
             /images
             /kartat
             /rg2
                 /css
                 /img
                 /lock
                 /log
                 /js
                     /vendor

3. Edit the rg2-config.php file in the /rg2 directory and enter the URL for your existing Routegadget installation. Change other configuration options as necessary.

4. Your data should now be available at e.g. http://www.club.routegadget.co.uk/rg2/index.php


