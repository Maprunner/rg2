<?php

require_once ('rg2-config.php');

// override allows testing of a local configuration such as c:/xampp/htdocs/rg2
if (file_exists('rg2-override-config.php')) {
	$override = true;
	require_once ('rg2-override-config.php');
} else {
	$override = false;
}

if (defined('OVERRIDE_UI_THEME')) {
	$ui_theme = OVERRIDE_UI_THEME;
} else {
	$ui_theme = UI_THEME;
}

if (defined('HEADER_COLOUR')) {
	$header_colour = HEADER_COLOUR;
} else {
	$header_colour = '#002bd9';
}
if (defined('HEADER_TEXT_COLOUR')) {
	$header_text_colour = HEADER_TEXT_COLOUR;
} else {
	$header_text_colour = '#ffffff';
}

if (defined('OVERRIDE_BASE_DIRECTORY')) {
	$json_url = OVERRIDE_BASE_DIRECTORY . "/rg2/rg2api.php";
	$script_url = OVERRIDE_BASE_DIRECTORY . "/rg2/js/";
	$img_url = OVERRIDE_BASE_DIRECTORY . "/rg2/img/";

} else {
	$json_url = RG_BASE_DIRECTORY . "/rg2/rg2api.php";
	$script_url = RG_BASE_DIRECTORY . "/rg2/js/";
	$img_url = RG_BASE_DIRECTORY . "/rg2/img/";
}

$maps_url = RG_BASE_DIRECTORY . "/kartat/";

// include manager function as parameter for now until we decide the best way forward
if (isset($_GET['manage'])) {
	$manager = true;
} else {
	$manager = false;
}

// include debug function as parameter for now until we decide the best way forward
if (isset($_GET['debug']) || $override) {
	$debug = true;
} else {
	$debug = false;
}
?>

<!DOCTYPE html>
<!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!-->
<html class="no-js">
  <!--<![endif]-->
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <title>Routegadget 2.0</title>
    <meta name="description" content="View and save route choices for orienteering events">
    <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1, maximum-scale=1">

    <link rel="stylesheet" href="css/normalize.min.css">
    <link rel="stylesheet" href="css/rg2.css">
    <link rel="stylesheet" href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/themes/<?php echo $ui_theme; ?>/jquery-ui.min.css">
    <link rel="stylesheet" href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css">
 
  </head>
  <body>
    <!--[if lt IE 7]>
    <p class="chromeframe">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> or <a href="http://www.google.com/chromeframe/?redirect=true">activate Google Chrome Frame</a> to improve your experience.</p>
    <![endif]-->

    <div id="rg2-header-container">
      <div  id="rg2-resize-info" title="Hide info panel">
        <a href="#"><img id="rg2-resize-info-icon" class="hide" src='<?php echo $img_url . "hide-info.png"; ?>'></a>
      </div>
      <div id="rg2-header"><span id="rg2-event-title">Routegadget 2.0</span></div>  
        <div class="rg2-button"><i id="btn-about" title = "Help" class="fa fa-question"></i></div>
        <div class="rg2-button"><i id="btn-options" title = "Options" class="fa fa-cog"></i></div>
        <div class="rg2-button"><i id="btn-zoom-out" title = "Zoom out" class="fa fa-search-minus"></i></div>
        <div class="rg2-button"><i id="btn-reset" title = "Reset" class="fa fa-undo"></i></div>
        <div class="rg2-button"><i id="btn-zoom-in" title = "Zoom in" class="fa fa-search-plus"></i></div>
        <div class="rg2-button"><i id="btn-show-splits" title = "Splits" class="fa fa-list-alt"></i></div>
        <div class="rg2-button"><i  id="btn-toggle-controls" title = "Show controls" class="fa fa-circle-o"></i></div>
        <div class="rg2-button"><i id="btn-toggle-names" title = "Show runner names" class="fa fa-tag"></i></div> 
    </div>
    <div id="rg2-container">
      <div id="rg2-info-panel">
        <div id="rg2-info-panel-tab-headers">
        <ul>
          <li id="rg2-events-tab">
            <a href="#rg2-event-list">Events</a>
          </li>
          <li id="rg2-courses-tab">
            <a href="#rg2-course-list">Courses</a>
          </li>
          <li id="rg2-results-tab">
            <a href="#rg2-result-list">Results</a>
          </li>
          <li id="rg2-draw-tab">
            <a href="#rg2-draw">Draw</a>
          </li>
          <?php if ($manager) { ?>
          <li id="rg2-login-tab">
            <a href="#rg2-manage-login">Login</a>
          </li>
          <li id="rg2-create-tab">
          	<a href="#rg2-manage-create">Create Event</a>
          </li>
          <li id="rg2-edit-tab">
          	<a href="#rg2-manage-edit">Edit Event</a>
          </li>
          <?php } ?>
   			</ul>
        </div>
        <div id="rg2-info-panel-tab-body">
        <div id="rg2-event-list"></div>
        <div id="rg2-course-list">
          <div id="rg2-course-table"></div>
        </div>
        <div id="rg2-result-list"></div>
      <div id="rg2-draw">
          <h3 class="no-top-margin">Draw route</h3>
          <div id="rg2-select-course">
           Select course: <select  id="rg2-course-select"></select>
          </div>     
          <div id="rg2-select-name">
           Select name: <select  id="rg2-name-select"></select>
          </div>
          <div id="rg2-enter-name">
           <p id = "rg2-name">Enter name: <input  id="rg2-name-entry" class="pushright" type="text"></p>
           <p id = "rg2-time">Enter time (mm:ss): <input  id="rg2-time-entry" class="pushright" type="text"></p>
          </div>
          <div>
           <textarea id="rg2-new-comments"></textarea>
          </div>
       <button id="btn-three-seconds">+3 sec</button>
       <button id="btn-undo">Undo</button>
       <button id="btn-save-route">Save</button>
       <button class="pushright" id="btn-reset-drawing">Reset</button>
          <hr class="rg2-hr">
          <h3>Load GPS file (GPX or TCX)</h3>
          <div id="rg2-select-gps-file">
           <input type='file' accept='.gpx, .tcx' id='rg2-load-gps-file'>
          </div>
       <input type=checkbox id="btn-move-all"><label for="btn-move-all"> Move track and map together (or right click-drag)</label>
       <ul>
        <li>Left click to add/lock/unlock a handle<ul><li>Green: draggable</li><li>Red: locked</li></ul></li>
        <li>Right click to delete a handle</li>
        <li>Drag a handle to adjust track around locked point(s)</li>
       </ul>
       <button id="btn-undo-gps-adjust">Undo</button>
       <button class="pushright" id="btn-save-gps-route">Save GPS route</button> 
    </div>
    <?php if ($manager) {include 'manager.html'; } ?>     
       </div>
      </div>
      <canvas id="rg2-map-canvas">Your browser does not support HTML5</canvas>
      <div id="rg2-animation-controls">
        <div class="rg2-ani-row row-1">
          <div class="rg2-button"><i id="btn-slower" title = "Slower" class="fa fa-minus"></i></div>
          <div class="rg2-button"><i id="btn-start-stop" title = "Run" class="fa fa-play"></i></div>
          <div class="rg2-button"><i id="btn-faster" title = "Faster" class="fa fa-plus"></i></div>
          <div id="rg2-clock"></div>
        </div>
        <div class="rg2-ani-row row-2">
          <div id="rg2-clock-slider"></div>
        </div>
        <div class="rg2-ani-row row-3">
          <div id="rg2-replay-start-control">
            Start at: <select  id="rg2-control-select"><option>S</option></select>
          </div>
          <div class="rg2-button"><i id="btn-real-time" title = "Real time" class="fa fa-clock-o"></i></div>
          <div class="rg2-button"><i id="btn-mass-start" title = "Mass start" class="fa fa-users"></i></div>
        </div>
        <div class="rg2-ani-row row-4">
          <div id="rg2-tails-spinner">
            <label for="spn-tail-length">Length</label>
            <input id="spn-tail-length" name="value" />
          </div>
          <div id="rg2-tails-type">
		        <label for="btn-full-tails">Full tails </label>
		        <input type="checkbox" id="btn-full-tails" />
		      </div>
		    </div>
		  </div>
		  <div id="rg2-hide-info-panel-control">
		    <a href="#"><i id="rg2-hide-info-panel-icon" class="fa fa-chevron-left"></i></a>
		  </div>		   
		  <div id="rg2-option-controls" title="Configuration options">
        <div id="rg2-dim-spinner">
          <label for="spn-map-intensity">Map intensity %</label>
          <input id="spn-map-intensity" name="value" />
        </div>
        <div id="rg2-course-width-spinner">
          <label for="spn-course-width">Course overprint width</label>
          <input id="spn-course-width" name="value" />
        </div>
        <div id="rg2-route-width-spinner">
          <label for="spn-route-width">Route width</label>
          <input id="spn-route-width" name="value" />
        </div>
        <div id="rg2-show-seconds">
          <label for="chk-show-three-seconds"> Show +3 time loss for GPS routes </label><input type=checkbox id="chk-show-three-seconds">
        </div>
      </div>
		  <div id="rg2-track-names"></div>
		  <div id="rg2-about-dialog" title="Routegadget 2.0">
			 <p>This application allows you to view existing <a href="http://www.routegadget.net">Routegadget</a> information in any modern (HTML5-compliant) browser without the need for Java.</p>
			 <p>The latest version is available for
			 	<a href="https://github.com/Maprunner/rg2/archive/master.zip"> download here</a>.
				 Later versions will allow you to create new events, but for now it only works on events that have been set
			   up in in the original Routegadget.</p>
			  <p><strong>Simon Errington</strong> (simon (at) maprunner.co.uk)</p>
        <p id="rg2-version-info"></p>
        <p><?php echo ADDITIONAL_INFO_TEXT; ?></p>
      </div>
      <div id="rg2-splits-table" title="Splits display"></div>
    </div>

    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
    <script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js"></script>
    <script type="text/javascript">var json_url =  "<?php echo $json_url; ?>";
      var maps_url = "<?php echo $maps_url; ?>";
      var header_colour = "<?php echo $header_colour; ?>";
      var header_text_colour = "<?php echo $header_text_colour; ?>";
    </script>
    <?php if ($debug) { ?>
      <script src='<?php echo $script_url . "events.js"; ?>'></script>
      <script src='<?php echo $script_url . "results.js"; ?>'></script>
      <script src='<?php echo $script_url . "gpstrack.js"; ?>'></script>
      <script src='<?php echo $script_url . "controls.js"; ?>'></script>
      <script src='<?php echo $script_url . "courses.js"; ?>'></script>
      <script src='<?php echo $script_url . "draw.js"; ?>'></script>
      <script src='<?php echo $script_url . "animation.js"; ?>'></script>
      <script src='<?php echo $script_url . "runner.js"; ?>'></script>
      <script src='<?php echo $script_url . "plugins.js"; ?>'></script>
      <script src='<?php echo $script_url . "rg2.js"; ?>'></script>
    <?php } else { ?>
      <script src='<?php echo $script_url . "rg2all.min.js"; ?>'></script>      
    <?php } ?>  
      <?php if ($manager) { ?>
      <script src='<?php echo $script_url . "manager.js"; ?>'></script>
      <?php } ?>
  </body>
</html>
