<?php

 require_once( 'rg2-config.php' ); 
 
 // override allows testing of a local configuration such as c:/xampp/htdocs/rg2
 if (file_exists('rg2-override-config.php')) {
 	require_once ( 'rg2-override-config.php');
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
    $json_url = OVERRIDE_BASE_DIRECTORY."/rg2/rg2api.php";
    $script_url = OVERRIDE_BASE_DIRECTORY."/rg2/js/";
    $img_url = OVERRIDE_BASE_DIRECTORY."/rg2/img/";

   } else {
  	$json_url = RG_BASE_DIRECTORY."/rg2/rg2api.php";
    $script_url = RG_BASE_DIRECTORY."/rg2/js/";
    $img_url = RG_BASE_DIRECTORY."/rg2/img/";
  }
  
  $maps_url = RG_BASE_DIRECTORY."/kartat/";
	
	// include manager function as parameter for now until we decide the best way forward
	if (isset($_GET['manage'])) {
    $manager = true;
	} else {
		$manager = false;
  }

  // include debug function as parameter for now until we decide the best way forward
  if (isset($_GET['debug'])) {
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
		<title>Routegadget 2.0 Viewer<?php if ($manager) {?> and Manager<?php } ?></title>
		<meta name="description" content="">
		<meta name="viewport" content="width=device-width">

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
				<a href="#"><img id="rg2-resize-info-icon" class="hide" src='<?php echo $img_url."hide-info.png"; ?>'></a>
			</div>
			<div id="rg2-header"><span id="rg2-event-title">Routegadget 2.0 Viewer</span></div>	
			  <div class="rg2-button"><i id="btn-about" title = "Help" class="fa fa-question"></i></div>
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
					<li id="rg2-manage-tab">
						<a href="#rg2-manage">Manage</a>
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
          <div id="rg2-select-course">
           Select course: <select  id="rg2-course-select"></select>
          </div>     
          <div id="rg2-name-course">
           Select name: <select  id="rg2-name-select"></select>
          </div>
          <div>
           <textarea id="rg2-new-comments"></textarea>
          </div>
       <button id="btn-three-seconds">+3 sec</button>
       <button id="btn-undo">Undo</button>
       <button id="btn-save-route">Save</button>
       <button class="pushright" id="btn-reset-drawing">Reset</button>
          <hr class="rg2-hr">
          <h3>Load GPS file</h3>
          <div id="rg2-select-gps-file">
           <input type='file' accept='.gpx' id='rg2-load-gps-file'>
          </div> 
       <input type=checkbox id="btn-move-all"><label for="btn-move-all"> Move track and map together</label>
       <ul>
        <li>Drag track to align track on map</li>
            <li>Single click to lock/unlock a point</li>
            <li>Drag to scale and rotate around locked point</li>
       </ul>
       <button class="pushright" id="btn-save-gps-route">Save GPS route</button> 
    </div>
				<?php if ($manager) { ?>
			  <div id="rg2-manage">
			    <form id="rg2-manager-login">
			  	  <div>
			  	  	<label for"rg2-user-name">User name: </label>
			  	    <input class="pushright" id="rg2-user-name" type="text">
			  	  </div>
			  	  <div>
			  	  	<label for"rg2-password">Password: </label>
			  	    <input class="pushright" id="rg2-password" type="password">
            </div>
			      <button id="btn-login">Log in</button>
			    </form>
			    <div id="rg2-manager-options">
			      <button id="btn-add-event">Add new event</button>
			      <input type=checkbox id="btn-move-map-and-controls"><label for="btn-move-map-and-controls"> Move map and controls together</label>
        	  <select id="rg2-manager-event-select"></select>
			      <button id="btn-edit-event">Edit selected event</button>
			      <button id="btn-delete-event">Delete selected event</button>

			    </div>
      </div>	
		  <?php } ?>
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
		  <div id="rg2-track-names"></div>
		  <div id="rg2-about-dialog" title="Routegadget 2.0 Viewer">
			 <p>This application allows you to view existing <a href="http://www.routegadget.net">Routegadget</a> information in any modern (HTML5-compliant) browser without the need for Java.</p>
			 <p>This is an early prototype to allow testing of the user interface. The latest version is available for
			 	<a href="https://github.com/Maprunner/rg2/archive/master.zip"> download here</a>.
				 Later versions will allow you to create new events, but for now it only works on events that have been set
			   up in in the original Routegadget.</p>
			  <p>It does not currently work properly on iPads, tablets and phones because of problems with the touch interface and screen size. This is on the list of things to be looked at.</p>
			  <p><strong>Simon Errington</strong> (simon (at) maprunner.co.uk)</p>
        <p id="rg2-version-info"></p>
			  <p><?php echo ADDITIONAL_INFO_TEXT; ?></p>
		  </div>
		  <div id="rg2-splits-table" title="Splits display"></div>
      <?php if ($manager) { ?>
		  <div id="rg2-add-new-event">
			  <form id="rg2-new-event-details">
          <div id="rg2-select-event-name">
            Event name:
          	<input id="rg2-event-name" type="text" autofocus></input>
          </div>
          <div id="rg2-select-map-name">
            Map name:
            <input id="rg2-map-name" type="text"></input>
          </div>
          <div id="rg2-select-club-name">
            Club name:
            <input id="rg2-club-name" type="text"></input>
          </div>
          <div id="rg2-select-event-date">
            Event date:
            <input id="rg2-event-date" type="text"></input>
          </div>
          <div id="rg2-select-event-level">
            Event level: <select id="rg2-event-level"></select>
          </div>
          <textarea id="rg2-event-comments"></textarea>
          <div id="rg2-select-map-file">
        	  <input type='file' accept='.jpg' id='rg2-load-map-file' />
        	  <label for="rg2-load-map-file">Map file</label>
        	</div>
          <div id="rg2-select-results-file">
        	  <input type='file' accept='.csv' id='rg2-load-results-file' />
            <label for="rg2-load-results-file">Results file</label>
          </div>
          <div id="rg2-select-course-file">
        	  <input type='file' accept='.xml' id='rg2-load-course-file' />
            <label for="rg2-load-course-file">Course file</label>       	   
        	</div>
        	<div id="rg2-course-allocations"></div>
          <div id="rg2-results-grouping">
            <label><input type='radio' name='rg2-course-breakdown' val='course' checked="checked" />Group results by course</label>
            <label><input type='radio' name='rg2-course-breakdown' val='class' />Group results by class</label>
          </div> 
        </form>
		  </div>
      <?php } ?>
    </div>

		<script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
		<script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js"></script>
		<script type="text/javascript">
			var json_url = "<?php echo $json_url; ?>";
			var maps_url = "<?php echo $maps_url; ?>";
			var header_colour = "<?php echo $header_colour; ?>";
			var header_text_colour = "<?php echo $header_text_colour; ?>";

		</script>
    <?php if ($debug) { ?>
		  <script src='<?php echo $script_url."events.js"; ?>'></script>
		  <script src='<?php echo $script_url."results.js"; ?>'></script>
		  <script src='<?php echo $script_url."gpstrack.js"; ?>'></script>
		  <script src='<?php echo $script_url."controls.js"; ?>'></script>
		  <script src='<?php echo $script_url."courses.js"; ?>'></script>
		  <script src='<?php echo $script_url."draw.js"; ?>'></script>
		  <script src='<?php echo $script_url."animation.js"; ?>'></script>
		  <script src='<?php echo $script_url."runner.js"; ?>'></script>
      <script src='<?php echo $script_url."plugins.js"; ?>'></script>
		  <script src='<?php echo $script_url."rg2.js"; ?>'></script>
		<?php } else { ?>
      <script src='<?php echo $script_url."rg2all.min.js"; ?>'></script>		  
		<?php } ?>  
      <?php if ($manager) { ?>
      <script src='<?php echo $script_url."manager.js"; ?>'></script>
      <?php } ?>
	</body>
</html>
