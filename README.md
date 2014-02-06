# Routegadget 2.0

## Latest news
Version 0.4.3 was released on 30th January and now provides nearly all the user functionality of the original Routegadget. It has been installed on all sites managed through routegadget.co.uk, and I am working with Paul Frost to keep these sites up to date with future versions as they are released. Recent significant changes include:
* Permalinks to allow direct access to a given event through a link ending #xx, where xx is the event number. For example, [http://www.happyherts.routegadget.co.uk/rg2/#149] (http://www.happyherts.routegadget.co.uk/rg2/#149) links directly to the HH event at Ashridge on 19th January.
* Entry of names, times and routes for events that were added without results (typically low-key events such as evening street score events).
* Ability to upload TCX files as well as GPX files.

## Error reporting
If you find a problem or want to suggest an enhancement then the first thing to do is check the [known issues list on Github] (https://github.com/Maprunner/rg2/issues).
If your problem is not already there then you can add it directly (although I think you need a Github account to do this) or you can email me (simon at maprunner dot co dot uk) and I will add it.

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

##Status
The user interface now includes all core functionality and should be fairly stable. You can draw a route and upload a recorded GPS file (GPX and TCX formats only at present).

Later versions will allow you to create new events (as a replacement of the original Manager), but for now it only works on events that have been set up in the
original Routegadget.

It does not currently work properly on iPads, tablets and phones because of problems with the touch interface and screen size. This is
on the list of things to be looked at.

## GPS file adjustment
When you upload a file it is initially fitted to the course as closely as possible. There are limited functions to adjust the route.
You can drag the whole route, and you can lock a point on it and then stretch and rotate the whole course around the locked point. There is no option to edit
parts of a route (as in RG1), and at the moment there is no intention to add this. The plan is to georeference maps and courses when they are added to
RG2, and no adjustment will then be needed. 

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

##Known installation problems
We have had two examples of a problem when creating the configuration file. Certain text editors (and it is not obvious which, or even if it always happens) can add three invisible bytes at the start of a file when saving it and this gives error when the file is read in. You will get a blank Events tab, and will possibly see a message starting "Events request failed: parsererror, SyntaxError: JSON Parse error:
Unrecognized token '<'".

The easiest solution is to recreate the config file in a different editor starting from the github version. 

For a full technical explanation see [UTF8 BOM in this article] (http://stackoverflow.com/questions/8028957/headers-already-sent-by-php). You can see the problem if you upload the config file to [http://en.webhex.net/] (http://en.webhex.net/).


