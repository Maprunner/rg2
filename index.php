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
			  <div class="rg2-button"><i id="btn-about"title = "Help" class="fa fa-question"></i></div>
			  <div class="rg2-button"><i id="btn-zoom-out" title = "Zoom out" class="fa fa-search-minus"></i></div>
			  <div class="rg2-button"><i id="btn-reset" title = "Reset" class="fa fa-undo"></i></div>
			  <div class="rg2-button"><i id="btn-zoom-in" title = "Zoom in" class="fa fa-search-plus"></i></div>
			  <div class="rg2-button"><i id="btn-show-splits" title = "Splits" class="fa fa-list-alt"></i></div>
			  <div class="rg2-button"><i  id="btn-toggle-controls" title = "Show controls"class="fa fa-circle-o"></i></div>
		    <div class="rg2-button"><i id="btn-toggle-names" title = "Show runner names" class="fa fa-tag"></i></div> 
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
					<li>
						<a href="#rg2-draw">Draw</a>
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
				<div id="rg2-draw">
          <div id="rg2-select-course">
        	  Select your course: <select  id="rg2-course-select"></select>
          </div>					
          <div id="rg2-name-course">
        	  Select your name: <select  id="rg2-name-select"></select>
          </div>	
			      <button id="btn-undo">Undo</button>
			      <button id="btn-save-route">Save</button>
			      <textarea id="rg2-comments">Enter your comments</textarea>
				  </div>
		  </div>
     
		  <canvas id="rg2-map-canvas">Your browser does not support HTML5</canvas>
	  
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
			    <label for "btn-full-tails">Full tails </label>
			    <input type="checkbox" id="btn-full-tails" />
			  </div>
			</div>		   
		  <div id="rg2-track-names"></div>
		  <div id="rg2-event-info-dialog"></div>
		  <div id="rg2-about-dialog" title="Routegadget 2.0 Viewer: Version 0.2">
			 <p>This application allows you to view existing <a href="http://www.routegadget.net">Routegadget</a> information in any modern (HTML5-compliant) browser without the need for Java.</p>
			 <p>This is an early prototype to allow testing of the user interface. The latest version is available for
			 	<a href="https://github.com/Maprunner/rg2/archive/master.zip"> download here</a>.
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
