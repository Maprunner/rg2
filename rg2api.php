<?php
  error_reporting(E_ALL);
  
  require_once( dirname(__FILE__) . '/rg2-config.php' );
  // override allows testing of a local configuration such as c:/xampp/htdocs/rg2
  if (file_exists(dirname(__FILE__) . '/rg2-override-config.php')) {
 	  require_once ( dirname(__FILE__) . '/rg2-override-config.php');
  }
	
	if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
    $url = OVERRIDE_KARTAT_DIRECTORY;
	} else {
    $url = "../kartat/";
  }
	
	define('KARTAT_DIRECTORY', $url);
  define ('LOCK_DIRECTORY', dirname(__FILE__)."/lock/");
	
  if (isset($_GET['type'])) {
    $type = $_GET['type'];
  } else {
  	$type = 'unknown';
  }
  if (isset($_GET['id'])) {
    $id = $_GET['id'];
  } else {
   $id = 0;
  } 

  if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    handleGetRequest($type, $id);
  } else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  	handlePostRequest($type, $id);
  } else {
  	die("Invalid request");
  }

function handlePostRequest($type, $eventid) {
  	
  $data = json_decode(file_get_contents('php://input'));
	
  switch ($type) {	
	case 'addroute':
    addNewRoute($eventid, $data);
    break;		
	default:
	  die("Request not recognised: ".$type);
		break;
	}	
}

function addNewRoute($eventid, $data) {
	//rg2log("Add new route for eventid ".$eventid);

	  // tidy up commments
  // may need more later
  $comments = trim($data->comments);
	$newcommentdata = $data->courseid."|".$data->resultid."|".$data->name."||".$comments.PHP_EOL;
	$filename = "kommentit_".$eventid.".txt";
	
	if (($handle = lockFile($filename)) !== FALSE) {
    $status =fwrite($handle, $newcommentdata);		
    unlockFile($filename, $handle);
		if ($status) {
		  $write["status"] = "Record saved";
	  } else {
		  $write["status"] = "Save error";
	  }
	} else {
		  $write["status"] = "File lock error";
	}
  // errors writing comments not reported

  // convert x,y to internal RG format
  $track = "";
  for ($i = 0; $i < count($data->x); $i++) {
  	$track .= 'N'.$data->x[$i].';-'.$data->y[$i];
  }

  $controls = "";
  for ($i = 0; $i < count($data->controlx); $i++) {
  	$controls .= 'N'.$data->controlx[$i].';-'.$data->controly[$i];
  }

  $newtrackdata = $data->courseid."|".$data->resultid."| ".$data->name."|null|".$track."|".$controls.PHP_EOL;
	
	$filename = "merkinnat_".$eventid.".txt";
	if (($handle = lockFile($filename)) !== FALSE) {
    $status =fwrite($handle, $newtrackdata);		
    unlockFile($filename, $handle);
	  if ($status) {
		  $write["status_msg"] = "Record saved";
			$write["ok"] = true;
	  } else {
		  $write["status_msg"] = "Save error";
			$write["ok"] = false;

	  }
	} else {
		  $write["status_msg"] = "File lock error";
			$write["ok"] = false;
	}

  header("Content-type: application/json"); 
  echo json_encode($write);
}
 
function lockFile($filename) {
	  // lock directory version based on http://docstore.mik.ua/orelly/webprog/pcook/ch18_25.htm
    // but note mkdir returns true if directory already exists!
    if (is_dir(LOCK_DIRECTORY.$filename)) {
    	// locked already by someone else
    	//rg2log("Directory exists");
    	$locked = false;
		} else {
			// try to lock it ourselves
      $locked = mkdir(LOCK_DIRECTORY.$filename ,0777);
    }
		$tries = 0;
		while (!$locked && ($tries < 5)) {
			// wait 500ms up to 5 times trying to get a lock
			usleep(500000);
      if (is_dir(LOCK_DIRECTORY.$filename)) {
    	  // locked already by someone else
    	  $locked = false;
		  } else {
			  // try to lock it ourselves
        $locked = mkdir(LOCK_DIRECTORY.$filename ,0777);
      }
			$tries++;
		}
		if ($locked) {
			// returns file handle if OK, false otherwise
			return fopen(KARTAT_DIRECTORY.$filename, "a");
		} else {
		  return $locked;
		}
}

function unlockFile($filename, $handle) {
	// ignore any errors but try to tidy up everything
  @fflush($handle);
  @fclose($handle);
  @rmdir(LOCK_DIRECTORY.$filename);		   	
}

function handleGetRequest($type, $id) {
  $output = array();
	   
  switch ($type) {	
	case 'events':
    $output = getAllEvents();
    break;		
	case 'courses':
    $output = getCoursesForEvent($id);
    break;	
	case 'results':
    $output = getResultsForEvent($id);
    break;
	case 'tracks':
    $output = getTracksForEvent($id);
    break;
	default:
	  die("Request not recognised: ".$type);
		break;
	}
	// output JSON data
  header("Content-type: application/json"); 
  echo "{\"data\":" .json_encode($output). "}";
}

function getAllEvents() {
  $output = array();
  $row = 0;
  if (($handle = fopen(KARTAT_DIRECTORY."kisat.txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $detail = array();
			$detail["id"] = $data[0];
			$detail["mapid"] = $data[1];
			$detail["status"] = $data[2];
			// Issue #11: found a stray &#39; in a SUFFOC file
			$detail["name"] = str_replace("&#39;", "'", $data[3]);
			$detail["date"] = $data[4];
			$detail["club"] = $data[5];
			$detail["type"] = $data[6];
			$detail["comment"] = $data[7];
			$output[$row] = $detail;				
      $row++;
    }
    fclose($handle);
	}
	return $output;
}

function isScoreEvent($eventid) {
  if (($handle = fopen(KARTAT_DIRECTORY."kisat.txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      if ($data[0] == $eventid) {
			  if ($data[2] == 3) {
          return true;
				} else {
					return false;
				}
			}
    }
	}
	return false;
}

function getResultsForEvent($eventid) {
  $output = array();
  $row = 0;
	$comments = 0;  
  $text = array();
  // @ suppresses error report if file does not exist
  if (($handle = @fopen(KARTAT_DIRECTORY."kommentit_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
	  	// remove null comments
  		if (strncmp($data[4], "Type your comment", 17) != 0) {
			  $text[$comments]["resultid"] = $data[1];
			  // replace carriage return and line break codes
        $temp = $data[4]; 
        $temp = str_replace("#cr#", " ", $temp);      
        $temp = str_replace("#nl#", " ", $temp);  
        $text[$comments]["comments"] = $temp;
        $comments++;
			}
    }
    fclose($handle);
	}

  // @ suppresses error report if file does not exist
  if (($handle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $detail = array();
	  	$detail["resultid"] = $data[0];
			$detail["courseid"] = $data[1];
			$detail["coursename"] = $data[2];
      $detail["name"] = $data[3];
			$detail["starttime"] = $data[4];
			$detail["time"] = $data[7];
			// trim trailing ; which create null fields when expanded
			$detail["splits"] = rtrim($data[8], ";");
			if (sizeof($data) > 9) {
				$detail["gpscoords"] = $data[9];
			} else {
				$detail["gpscoords"] = "";					
			}
			$detail["comments"] = "";
			for ($i = 0; $i < $comments; $i++) {
			  if ($detail["resultid"] == $text[$i]["resultid"]) {
          $detail["comments"] = $text[$i]["comments"];			
				}
			}	
			$output[$row] = $detail;				
      $row++;
    }
    fclose($handle);
	}
	return $output;
}

function getCoursesForEvent($eventid) {
  $output = array();
  $row = 0;
  // extract control codes
  $controlsFound = false;
  $controls = array();
  $xpos = array();
	$ypos = array();
  // @ suppresses error report if file does not exist
  if (($handle = @fopen(KARTAT_DIRECTORY."sarjojenkoodit_".$eventid.".txt", "r")) !== FALSE) {
    $controlsFound = true;
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      // ignore first field: it is an index	
      $codes = array();
      for ($j = 1; $j < count($data); $j++) {
			  $codes[$j - 1] = $data[$j];
			}	
			$controls[$row] = $codes;
			$row++;		
    }
    fclose($handle);
  }

  // extract control locations based on map co-ords
  if (($handle = fopen(KARTAT_DIRECTORY."ratapisteet_".$eventid.".txt", "r")) !== FALSE) {
    $row = 0;	
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      // ignore first field: it is an index	
      $x = array();
		  $y = array();
			// field is N separated and then comma separated	
			$pairs = explode("N", $data[1]);
			for ($j = 0; $j < count($pairs); $j++) {
  			$xy = explode(";", $pairs[$j]);
        // some courses seem to have nulls at the end so just ignore them
        if ($xy[0] != "") {
		      $x[$j] = 1 * $xy[0];
				  // make it easier to draw map
				  $y[$j] = -1 * $xy[1];
				}		  			
			}
			$xpos[$row] = $x;
			$ypos[$row] = $y;
			$row++;		
    }
    fclose($handle);
  }

	$row = 0; 
  // extract course drawing info: now potentially redundant since done in browser based on other info
  if (($handle = fopen(KARTAT_DIRECTORY."radat_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $detail = array();
		  $detail["courseid"] = $data[0];
			$detail["status"] = $data[1];
			$detail["name"] = $data[2];
			$detail["coords"] = $data[3];
			if ($controlsFound) {
				if (isScoreEvent($eventid))	{
					// score event so assume only one course for now
					// needs a further look for multi-course score events
				  $detail["codes"] = $controls[0];
				} else {
				  $detail["codes"] = $controls[$row];					
				}
			}
			$detail["xpos"] = $xpos[$row];
			$detail["ypos"] = $ypos[$row];
			$output[$row] = $detail;				
      $row++;
	  }
    fclose($handle);
	}
	return $output;
}

function getTracksForEvent($eventid) {
  $output = array();
  $row = 0;
  // @ suppresses error report if file does not exist
  if (($handle = @fopen(KARTAT_DIRECTORY."merkinnat_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $detail = array();
			$detail["courseid"] = $data[0];
			$detail["resultid"] = $data[1];
			$detail["name"] = $data[2];
			$detail["null"] = $data[3];
			$detail["coords"] = $data[4];
			//$detail["mystery"] = $data[5];
			$output[$row] = $detail;				
      $row++;
    }
    fclose($handle);
	}
	return $output;
}

function rg2log($msg) {
	if (defined('RG_LOG_FILE')){
		error_log(date("H:i:s", time()).": ".$msg.PHP_EOL, 3, RG_LOG_FILE);
	}
}
?>