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
		<title>Routegadget 2.0 Viewer</title>
		<meta name="description" content="">
		<meta name="viewport" content="width=device-width">

		<link rel="stylesheet" href="css/normalize.min.css">
		<link rel="stylesheet" href="css/rg2.css">
		<link rel="stylesheet" href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/themes/<?php echo $ui_theme; ?>/jquery-ui.min.css">
 
	</head>
	<body>
		<!--[if lt IE 7]>
		<p class="chromeframe">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> or <a href="http://www.google.com/chromeframe/?redirect=true">activate Google Chrome Frame</a> to improve your experience.</p>
		<![endif]-->

		<div id="rg2-header-container">
			<div  id="rg2-resize-info" title="Show/hide info panel">
				<a href="#"><img id="rg2-resize-info-icon" src='<?php echo $img_url."hide-info.png"; ?>'></a>
			</div>
			<div id="rg2-header"><span id="rg2-event-title">Routegadget 2.0 Viewer</span>
			</div>
			<div id="rg2-about">About</div>
		</div>
		</div>
		<div id="rg2-container">
			<div id="rg2-info-panel">
				<ul>
					<li>
						<a href="#rg2-event-list">Events</a>
					</li>
					<li>
						<a href="#rg2-course-list">Courses</a>
					</li>
					<li>
						<a href="#rg2-result-list">Results</a>
					</li>
					<li>
						<a href="#rg2-replay">Replay</a>
					</li>
				</ul>
				<div id="rg2-event-list"></div>
				<div id="rg2-course-list">
					<div id="rg2-course-table"></div>
				</div>
				<div id="rg2-result-list"></div>
				<div id="rg2-replay">
					<div id="rg2-animation-names"></div>
				</div> 
		  </div>

		  <canvas id="rg2-map-canvas">Your browser does not support HTML5</canvas>
		  <div id="rg2-button-bar">
			  <button id ="btn-toggle-controls">Show all controls</button>
			  <button id ="btn-show-splits">Splits</button>
			  <button id ="btn-zoom-in">Zoom in</button>
			  <button id="btn-reset">Reset</button>
			  <button id="btn-zoom-out">Zoom out</button>
		  </div>
		  <div id="rg2-ani-bar">
			  <div>
			    <button id ="btn-start-stop">Run</button>
			    <button id="btn-faster">Faster</button>
			    <button id="btn-slower">Slower</button>
		    </div>
		    <div class="ani-para">
		  	  <div id="btn-replay-type">
			      <input type="radio" id="btn-real-time" value="btn-real-time" name="btn-replay-type" /><label for="btn-real-time">Real time</label>
            <input type="radio" id="btn-mass-start" value="btn-mass-start" name="btn-replay-type" /><label for="btn-mass-start">Mass start</label>
          </div>
          <div id="rg2-replay-start-control"> 
            <p>Start at:
            <select  id="rg2-control-select"><option>S</option></select>
            </p>
          </div>
        </div>
        <div class="ani-para" id="rg2-clock"></div>
        <div class = "ani-para" id="rg2-clock-slider"></div>
			  <div class="ani-para">
				  <label for "btn-full-tails">Full tails</label>
				  <input type="checkbox" id="btn-full-tails" />
          <div id="rg2-tails-spinner">
            <input id="spn-tail-length" name="value" />
         	  <label for="spn-tail-length">Tail length</label>
          </div>
        </div>
      </div>
		  <div id="rg2-track-names"></div>
		  <div id="rg2-about-dialog" title="Routegadget 2.0 Viewer: Version 0.1">
			 <p>This application allows you to view existing <a href="http://www.routegadget.net">Routegadget</a> information in any modern (HTML5-compliant) browser without the need for Java.</p>
			 <p>This is an early prototype to allow testing of the user interface, and the layout may still change quite a lot.
				 Later versions will allow you to create new events and upload routes, but for now it only works on events that have been set
			 up in in the original Routegadget.</p>
			<p>It does not currently work properly on iPads, tablets and phones because of problems with the touch interface and screen size. This is on the list of things to be looked at.</p>
			<p><strong>Simon Errington</strong> (simon (at) maprunner.co.uk)</p>
		  </div>
			<div id="rg2-splits-table" title="Splits display"></div>
		</div>
		<div id="rg2-footer"><?php echo FOOTER_TEXT; ?></div>

		<script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js"></script>
		<script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js"></script>
		<script src='<?php echo $script_url."plugins.js"; ?>'></script>
		<script type="text/javascript">
			var json_url = "<?php echo $json_url; ?>";
			var maps_url = "<?php echo $maps_url; ?>";
		</script>
		<script src='<?php echo $script_url."rg2.js"; ?>'></script>
	</body>
</html>
