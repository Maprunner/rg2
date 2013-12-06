<?php
/**
 * The configuration file for RG2.
 * 
 * This file should be modified to set up the details for a specific Routegadget installation.
 * 
 */
  // Location of directory where Routegadget is installed.
  // This should have /cgi-bin, /kartat and /rg2 sub-directories.
  // Example define('RG_BASE_DIRECTORY', 'http://www.happyherts.routegadget.co.uk');
  //define('RG_BASE_DIRECTORY', 'C:/xampp/htdocs/HHRoutegadget');
  define('RG_BASE_DIRECTORY', 'http://www.happyherts.routegadget.co.uk');

  //
  // Set encoding for input data default UTF-8
  define('RG_INPUT_ENCODING', 'UTF-8');
  //
  // Set encoding for output data returned through API
  define('RG_OUTPUT_ENCODING', 'UTF-8//TRANSLIT//IGNORE');

  // User interface colour theme: see gallery at http://jqueryui.com/themeroller/
  // Example define('UI_THEME', 'excite-bike');
  define('UI_THEME', 'excite-bike');

  // text to display in footer. Use '' to leave blank.
  define('FOOTER_TEXT', '© Maprunner 2013. Maps published on this web site that contain OS data by permission of Ordnance Survey® Licence Number 100046745.');
	
?>
