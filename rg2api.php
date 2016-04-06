<?php
  error_reporting(E_ALL);
  require_once( dirname(__FILE__) . '/rg2-config.php' );
  // override allows testing of a local configuration such as c:/xampp/htdocs/rg2
  if (file_exists(dirname(__FILE__) . '/rg2-override-config.php')) {
    require_once ( dirname(__FILE__) . '/rg2-override-config.php');
    define ('DEBUG', true);
  }
  // enable logging by default
  if (!defined('RG_LOG_FILE')) {
    define("RG_LOG_FILE", dirname(__FILE__)."/log/rg2log.txt");
  }

  if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
    $url = OVERRIDE_KARTAT_DIRECTORY;
  } else {
    $url = "../kartat/";
  }

  //
  // The default encoding used by Route Gadget 2
  define('RG2_ENCODING', 'UTF-8');

  //
  // The input encoding from files in kartat directory
  // note: backward compatibility for old RG_INPUT_ENCODING configuration
  if (defined('RG_INPUT_ENCODING')) {
    //
    define('RG_FILE_ENCODING', RG_INPUT_ENCODING);
  }

  // version replaced by Gruntfile as part of release 
  define ('RG2VERSION', '1.2.6');
  define ('KARTAT_DIRECTORY', $url);
  define ('LOCK_DIRECTORY', dirname(__FILE__)."/lock/saving/");
  define ('CACHE_DIRECTORY', $url."cache/");
  define ('GPS_RESULT_OFFSET', 50000);
  define ('GPS_INTERVAL', 3);
  define ('SCORE_EVENT_FORMAT', 3);
  
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
    if ($type == 'uploadmapfile') {
      uploadMapFile();
    } else {
      handlePostRequest($type, $id);
    }
  } else {
    header('HTTP/1.1 405 Method Not Allowed');
    header('Allow: GET, POST');
  }


// Note: convert encoding read from kartat files to encoding use in rg2 browser
// Handle the encoding for input data if kartat directory files are not using RG2_ENCODING encoding
//
function encode_rg_input($input_str) {
  $encoded = '';
  if ( RG_FILE_ENCODING != RG2_ENCODING ) {
    //
    $encoded = @iconv( RG_FILE_ENCODING, RG2_ENCODING . '//TRANSLIT//IGNORE', $input_str);
  } else {
    // this removes any non-RG2_ENCODING characters that are stored locally, normally by an original Routegadget installation
    $encoded = mb_convert_encoding($input_str, RG2_ENCODING, RG2_ENCODING);
  }
  if ( !$encoded ) {
    //
    $encoded = "";
  } else {
    // ENT_COMPAT is just a default flag: ENT_SUBSTITUTE is PHP 5.4.0+
    $encoded = htmlentities($encoded, ENT_COMPAT, RG2_ENCODING);
  }
  return $encoded;
}

// Note: convert encoding from rg2 browser to encoding use for kartat files
// Handle the encoding for output data if kartat directory files are not using UTF-8 encoding
//
function encode_rg_output($output_str) {
  $encoded = '';
  if ( RG_FILE_ENCODING != RG2_ENCODING && mb_detect_encoding($output_str, RG2_ENCODING, true) ) {
    // convert if kartat files doesn't use RG2_ENCODING and output_str is encoded using RG2_ENCODING
    $encoded = @iconv( RG2_ENCODING, RG_FILE_ENCODING . '//TRANSLIT//IGNORE', $output_str);
  } else {
    // write output as is, if kartat files are useing RG2_ENCODING or input couldn't not be converted from RG2_ENCODING to RG_FILE_ENCODING
    $encoded = $output_str;
  }
  if ( !$encoded ) {
    //
    $encoded = "";
  }
  return $encoded;
}

function uploadMapFile() {
  $write = array();
  $write["ok"] = FALSE;
  $write["status_msg"] = "Map upload failed.";
  $data = new stdClass();
  $data->x = $_POST["x"];
  $data->y = $_POST["y"];
  if (!logIn($data)) {
    $write["status_msg"] = "Login failed.";
  } else {       
    $filename = $_POST["name"];
    // PHP changes . and space to _ just for fun
    $filename = str_replace(".", "_", $filename);
    $filename = str_replace(" ", "_", $filename);
    if (is_uploaded_file($_FILES[$filename]['tmp_name'])) {
      $file = $_FILES[$filename];
      if ($file['type'] == 'image/jpeg') {
        if (move_uploaded_file($file['tmp_name'], KARTAT_DIRECTORY.'temp.jpg')) {
            $write["ok"] = TRUE;
            $write["status_msg"] = "Map uploaded.";
        }
      }
      if ($file['type'] == 'image/gif') {
        if ($image = imagecreatefromgif($file['tmp_name'])) {
          if (imagejpeg($image, KARTAT_DIRECTORY.'temp.jpg')) {
            if (move_uploaded_file($file['tmp_name'], KARTAT_DIRECTORY.'temp.gif')) {
              $write['ok'] = TRUE;
              $write['status_msg'] = "Map uploaded.";
            }
          }
        }
      }
    }
  }
  
  $keksi = generateNewKeksi();
  $write["keksi"] = $keksi;
  
  header("Content-type: application/json");
  echo json_encode($write);
}
  
function handlePostRequest($type, $eventid) {
  $data = json_decode(file_get_contents('php://input'));
  $write = array();
  if (lockDatabase() !== FALSE) {
    if ($type != 'addroute') {
      $loggedIn = logIn($data);
    } else {
      // don't need to log in to add a route 
      $loggedIn = TRUE;
    }
    if ($loggedIn) {
      //rg2log($type);
      switch ($type) {
      case 'addroute':
        $write = addNewRoute($eventid, $data);
        @unlink(CACHE_DIRECTORY."results_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."tracks_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;

      case 'addmap':
        $write = addNewMap($data);
        break;

      case 'createevent':
        $write = addNewEvent($data);
        @unlink(CACHE_DIRECTORY."events.json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;
 
      case 'editevent':
        $write = editEvent($eventid, $data);
        @unlink(CACHE_DIRECTORY."events.json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;

      case 'deleteevent':
        $write = deleteEvent($eventid);
        @unlink(CACHE_DIRECTORY."events.json");
        @unlink(CACHE_DIRECTORY."results_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."courses_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."tracks_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."stats.json");
       break;

      case 'deleteroute':
        $write = deleteRoute($eventid);
        @unlink(CACHE_DIRECTORY."results_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."tracks_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;
        
      case 'deletecourse':
        $write = deleteCourse($eventid);
        @unlink(CACHE_DIRECTORY."results_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."courses_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."tracks_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;
      
      case 'login':
        // handled by default before we got here
        $write["ok"] = TRUE;
        $write["status_msg"] = "Login successful";
        break;
      
      default:
        rg2log("Post request not recognised: ".$type);
        $write["status_msg"] = "Request not recognised: ".$type;
        $write["ok"] = FALSE;
        break;
      } 
    } else {
      $write["ok"] = FALSE;
      $write["status_msg"] = "Incorrect user name or password";
    }
    unlockDatabase();
  } else {
    $write["status_msg"] = "File lock error";
    $write["ok"] = FALSE;
  } 
  
  $keksi = generateNewKeksi();
  $write["keksi"] = $keksi;
  
  header("Content-type: application/json");
  $write["version"] = RG2VERSION;
  echo json_encode($write);
}

function logIn ($data) {
  if (isset($data->x) && isset($data->y)) {
    $userdetails = extractString($data->x);
    $cookie = $data->y;
  } else {
    $userdetails = "anon";
    $cookie = "none";
  }
  $ok = TRUE;
  $keksi = trim(file_get_contents(KARTAT_DIRECTORY."keksi.txt"));
  //rg2log("logIn ".$userdetails." ".$cookie);
  if (file_exists(KARTAT_DIRECTORY."rg2userinfo.txt")) {
    $saved_user = trim(file_get_contents(KARTAT_DIRECTORY."rg2userinfo.txt"));
    $temp = crypt($userdetails, $saved_user);
    if ($temp != $saved_user) {
      //rg2log("User details incorrect. ".$temp." : ".$saved_user);
      $ok = FALSE;
    }
    if ($keksi != $cookie) {
      //rg2log("Cookies don't match. ".$keksi." : ".$cookie);
      $ok = FALSE;
    }
  } else {
    // new account being set up: rely on JS end to force a reasonable name/password
    $temp = crypt($userdetails, $keksi);
    rg2log("Creating new account ".$temp);
    file_put_contents(KARTAT_DIRECTORY."rg2userinfo.txt", $temp.PHP_EOL);
  }
  return $ok;
}

// Mickey Mouse function to extract user name and password
// just avoids plain text transmission for now so a bit better than RG1
function extractString($data) {
  $str = "";
  for ($i = 0; $i < strlen($data); $i = $i + 2) {
    $str .= substr($data, $i, 1);
  }
  return $str;
}

function generateNewKeksi() {
  // simple cookie generator! Don't need unique, just need something vaguely random
  $keksi = substr(str_shuffle("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"), 0, 20);
  file_put_contents(KARTAT_DIRECTORY."keksi.txt", $keksi.PHP_EOL);
  //rg2log("Writing keksi.txt ".$keksi);
  return $keksi;
}

function addNewEvent($data) {
  $format = $data->format;
  $write["status_msg"] = "";
  if (($handle = @fopen(KARTAT_DIRECTORY."kisat.txt", "r+")) !== FALSE) {
    // read to end of file to find last entry
    $oldid = 0;
    while (($olddata = fgetcsv($handle, 0, "|")) !== FALSE) {
      $oldid = intval($olddata[0]);
    }
    $newid = $oldid + 1;
  } else {
    // create new kisat file
    $newid = 1;
    $handle = @fopen(KARTAT_DIRECTORY."kisat.txt", "w+");
  }
  $name = encode_rg_output($data->name);
  $club = encode_rg_output($data->club);
  $comments = tidyNewComments($data->comments);
  $newevent = $newid."|".$data->mapid."|".$data->format."|".$name."|".$data->eventdate."|".$club."|".$data->level."|".$comments;
  $newevent .= PHP_EOL;
  $write["newid"] = $newid;
  $status =fwrite($handle, $newevent);
  if (!$status) {
    $write["status_msg"] = "Save error for kisat. ";
  }
  @fflush($handle);
  @fclose($handle);
  
  // create new sarjat file: course names
  $courses = "";
  for ($i = 0; $i < count($data->courses); $i++) {
    $courses .= $data->courses[$i]->courseid."|".encode_rg_output($data->courses[$i]->name).PHP_EOL;
  }
  file_put_contents(KARTAT_DIRECTORY."sarjat_".$newid.".txt", $courses, FILE_APPEND);

  // create new sarjojenkoodit file: course control lists
  for ($i = 0; $i < count($data->courses); $i++) {
    $controls = $data->courses[$i]->courseid;
    for ($j = 0; $j < count($data->courses[$i]->codes); $j++) {
          $controls .= "|".$data->courses[$i]->codes[$j];
    }
    $controls .= PHP_EOL;
    file_put_contents(KARTAT_DIRECTORY."sarjojenkoodit_".$newid.".txt", $controls, FILE_APPEND);
  }

  // create new ratapisteet file: control locations
  if (($format == SCORE_EVENT_FORMAT) && (count($data->results) > 0)) {
    // score event with results so save variants
    for ($i = 0; $i < count($data->variants); $i++) {
      $controls = $data->variants[$i]->id."|";
      for ($j = 0; $j < count($data->variants[$i]->x); $j++) {
        $controls .= $data->variants[$i]->x[$j].";-".$data->variants[$i]->y[$j]."N";
      }
      $controls .= PHP_EOL;
      file_put_contents(KARTAT_DIRECTORY."ratapisteet_".$newid.".txt", $controls, FILE_APPEND);
    } 
  } else {
      // normal event or score event without results so save courses
      for ($i = 0; $i < count($data->courses); $i++) {
      $controls = $data->courses[$i]->courseid."|";
      for ($j = 0; $j < count($data->courses[$i]->x); $j++) {
        $controls .= $data->courses[$i]->x[$j].";-".$data->courses[$i]->y[$j]."N";
      }
      $controls .= PHP_EOL;
      file_put_contents(KARTAT_DIRECTORY."ratapisteet_".$newid.".txt", $controls, FILE_APPEND);
    }
  }

  // create new hajontakanta file: control sequences for course variants
  // originally for score/relay only, but may be usable for butterflies in future
  if (($format == SCORE_EVENT_FORMAT) && (count($data->results > 0))) {
    // score event so save variants
    for ($i = 0; $i < count($data->variants); $i++) {
      $controls = $data->variants[$i]->id."|".$data->variants[$i]->name."|";
      // data includes start and finish which we don't want
      for ($j = 1; $j < (count($data->variants[$i]->codes) - 1); $j++) {
        if ($j > 1) {
          $controls .= "_";
        }
        $controls .= $data->variants[$i]->codes[$j];
      }
      $controls .= PHP_EOL;
      file_put_contents(KARTAT_DIRECTORY."hajontakanta_".$newid.".txt", $controls, FILE_APPEND);
    }
  } else {
    // normal event or score event without results so save courses
    for ($i = 0; $i < count($data->courses); $i++) {
      $controls = $data->courses[$i]->courseid."|".$data->courses[$i]->name."|";
      // data includes start and finish which we don't want
      for ($j = 1; $j < (count($data->courses[$i]->codes) - 1); $j++) {
        if ($j > 1) {
          $controls .= "_";
        }
        $controls .= $data->courses[$i]->codes[$j];
      }
      $controls .= PHP_EOL;
      file_put_contents(KARTAT_DIRECTORY."hajontakanta_".$newid.".txt", $controls, FILE_APPEND);
    }
  }

  // create new radat file: course drawing: RG2 uses this for score event control locations
  $course = "";
  if (($format == SCORE_EVENT_FORMAT) && (count($data->results > 0))) { 
    // score event: one row per variant    
    for ($i = 0; $i < count($data->variants); $i++) {
      $a = $data->variants[$i];
      $finish = count($a->x) - 1;
      $course .= $a->id."|".$a->courseid."|".encode_rg_output($a->name)."|2;";
      $course .= $a->x[$finish].";-".$a->y[$finish].";0;0N";
      // loop from first to last control
      for ($j = 1; $j < $finish; $j++) {       
        // control circle
        $course .= "1;".$a->x[$j].";-".$a->y[$j].";0;0N";
        // line between controls
        list($x1, $y1, $x2, $y2) = getLineEnds($a->x[$j], $a->y[$j], $a->x[$j-1], $a->y[$j-1]);
        $course .= "4;".$x1.";-".$y1.";".$x2.";-".$y2."N";
        // text: just use 20 offset for now: RG1 and RGJS seem happy
        $course .= "3;".($a->x[$j] + 20).";-".($a->y[$j] + 20).";".$j.";0N";
      }
      // start triangle
      $side = 20;
      $angle = getAngle($a->x[0], $a->y[0], $a->x[1], $a->y[1]);
      $angle = $angle + (M_PI / 2);
      $x0 = (int) ($a->x[0] + ($side * sin($angle)));
      $y0 = (int) ($a->y[0] - ($side * cos($angle)));
      $x1 = (int) ($a->x[0] + ($side * sin($angle + (2 * M_PI / 3))));
      $y1 = (int) ($a->y[0] - ($side * cos($angle + (2 * M_PI / 3))));
      $x2 = (int) ($a->x[0] + ($side * sin($angle - (2 * M_PI / 3))));
      $y2 = (int) ($a->y[0] - ($side * cos($angle - (2 * M_PI / 3))));
    
      $course .= "4;".$x0.";-".$y0.";".$x1.";-".$y1."N";
      $course .= "4;".$x1.";-".$y1.";".$x2.";-".$y2."N";
      $course .= "4;".$x2.";-".$y2.";".$x0.";-".$y0."N";
    
      $course .= PHP_EOL;
    }

  } else {
    // normal event or score event without results so save courses: one row per course
    for ($i = 0; $i < count($data->courses); $i++) {
      $a = $data->courses[$i];
      $finish = count($a->x) - 1;
      $course .= $a->courseid."|".$a->courseid."|".encode_rg_output($a->name)."|2;";
      $course .= $a->x[$finish].";-".$a->y[$finish].";0;0N";
      // loop from first to last control
      for ($j = 1; $j < $finish; $j++) {
        // control circle
        $course .= "1;".$a->x[$j].";-".$a->y[$j].";0;0N";
        // line between controls
        list($x1, $y1, $x2, $y2) = getLineEnds($a->x[$j], $a->y[$j], $a->x[$j-1], $a->y[$j-1]);
        $course .= "4;".$x1.";-".$y1.";".$x2.";-".$y2."N";
        // text: just use 20 offset for now: RG1 and RGJS seem happy
        $course .= "3;".($a->x[$j] + 20).";-".($a->y[$j] + 20).";".$j.";0N";
      }
      // start triangle
      $side = 20;
      $angle = getAngle($a->x[0], $a->y[0], $a->x[1], $a->y[1]);
      $angle = $angle + (M_PI / 2);
      $x0 = (int) ($a->x[0] + ($side * sin($angle)));
      $y0 = (int) ($a->y[0] - ($side * cos($angle)));
      $x1 = (int) ($a->x[0] + ($side * sin($angle + (2 * M_PI / 3))));
      $y1 = (int) ($a->y[0] - ($side * cos($angle + (2 * M_PI / 3))));
      $x2 = (int) ($a->x[0] + ($side * sin($angle - (2 * M_PI / 3))));
      $y2 = (int) ($a->y[0] - ($side * cos($angle - (2 * M_PI / 3))));
    
      $course .= "4;".$x0.";-".$y0.";".$x1.";-".$y1."N";
      $course .= "4;".$x1.";-".$y1.";".$x2.";-".$y2."N";
      $course .= "4;".$x2.";-".$y2.";".$x0.";-".$y0."N";
    
      $course .= PHP_EOL;
    }
  }
  file_put_contents(KARTAT_DIRECTORY."radat_".$newid.".txt", $course);
  
  // create new kilpailijat file: results
  for ($i = 0; $i < count($data->results); $i++) {
    $a = $data->results[$i];
    // save position and status if we got them
    if (isset($a->position)) {
      $position = $a->position;
    } else {
      $position = '';
    }
    if (isset($a->status)) {
      $status = abbreviateStatus($a->status);
    } else {
      $status = '';
    }
    $result = ($i + 1)."|".$a->courseid."|".encode_rg_output($a->course)."|".encode_rg_output(trim($a->name))."|".$a->starttime."|";
    // abusing dbid to save status and position
    $result .= encode_rg_output($a->dbid)."_#".$position."#".$status;
    $result .= "|".$a->variantid."|".$a->time."|".$a->splits.PHP_EOL;
    file_put_contents(KARTAT_DIRECTORY."kilpailijat_".$newid.".txt", $result, FILE_APPEND);
  }
  
  if ($write["status_msg"] == "") {
    $write["ok"] = TRUE;
    $write["status_msg"] = "Event created.";
  } else {
    $write["ok"] = FALSE;
  }
  rg2log("Added new event ");
  return $write;

}

function abbreviateStatus($text) {
  // mappings for ResultStatus in IOF XML V3 and V2.0.3
  switch ($text) {  
    case 'OK':
      return 'OK';
    case 'MissingPunch':
      return 'mp';
    case 'MisPunch':
      return 'mp';
    case 'Disqualified':
      return 'dsq';
    case 'DidNotFinish':
      return 'dnf';
    case 'OverTime':
      return 'ot';
    case 'SportingWithdrawal':
      return 'swd';
    case 'SportingWithdr':
      return 'swd';
    case 'NotCompeting':
      return 'nc';
    case 'DidNotStart':
      return 'dns';
    default:
      return $text;
  }
}

function getAngle($x1, $y1, $x2, $y2) {
  $angle = atan2($y2 - $y1, $x2 - $x1);
  if ($angle < 0) {
    $angle = $angle + (2 * M_PI);
  }
  return $angle;
}

function getLineEnds($x1, $y1, $x2, $y2) {
  $offset = 20;
  $angle = getAngle($x1, $y1, $x2, $y2);
  $c1x = (int) ($x1 + ($offset * cos($angle)));
  $c1y = (int) ($y1 + ($offset * sin($angle)));
  $c2x = (int) ($x2 - ($offset * cos($angle)));
  $c2y = (int) ($y2 - ($offset * sin($angle)));
  return array($c1x, $c1y, $c2x, $c2y);
}
      
function editEvent($eventid, $newdata) {
  $write["status_msg"] = "";
  $updatedfile = array();
  $oldfile = file(KARTAT_DIRECTORY."kisat.txt");
  foreach ($oldfile as $row) {
    $data = explode("|", $row);
    if ($data[0] == $eventid) {
      $data[3] = encode_rg_output($newdata->name);
      $data[4] = $newdata->eventdate;
      $data[5] = encode_rg_output($newdata->club);
      $data[6] = $newdata->type;
      $data[7] = tidyNewComments($newdata->comments);
      $row = "";
      // reconstruct |-separated row
      for ($i = 0; $i < count($data); $i++) {
        if ($i > 0) {
          $row .= "|";
        }
        $row .= $data[$i];
      }
      $row .= PHP_EOL;
    }
    $updatedfile[] = $row;
  }
  $status = file_put_contents(KARTAT_DIRECTORY."kisat.txt", $updatedfile);
  
  if (!$status) {
    $write["status_msg"] .= " Save error for kisat.txt.";
  }
  if ($write["status_msg"] == "") {
    $write["ok"] = TRUE;
    $write["status_msg"] = "Event detail updated";
    rg2log("Event updated|".$eventid);
  } else {
    $write["ok"] = FALSE;
  }
  
  return($write);
}

function deleteEvent($eventid) {
  $write["status_msg"] = "";
  $updatedfile = array();
  $oldfile = file(KARTAT_DIRECTORY."kisat.txt");
  foreach ($oldfile as $row) {
    $data = explode("|", $row);
    if ($data[0] != $eventid) {
      $updatedfile[] = $row;
    }
  }
  $status = file_put_contents(KARTAT_DIRECTORY."kisat.txt", $updatedfile);
  
  if (!$status) {
    $write["status_msg"] .= " Save error for kisat.";
  }
  
  // rename all associated files but don't worry about errors
  // safer than deleting them since you can always add the event again
  $files = array("kilpailijat_", "kommentit_", "hajontakanta_", "merkinnat_", "radat_", "ratapisteet_", "sarjat_", "sarjojenkoodit_");
  foreach ($files as $file) {
    @rename(KARTAT_DIRECTORY.$file.$eventid.".txt", KARTAT_DIRECTORY."deleted_".$file.$eventid.".txt");
  }
              
  if ($write["status_msg"] == "") {
    $write["ok"] = TRUE;
    $write["status_msg"] = "Event deleted";
    rg2log("Event deleted|".$eventid);
  } else {
    $write["ok"] = FALSE;
  }
  
  return($write);
}

function deleteCourse($eventid) {
  $write["status_msg"] = "";
  if (isset($_GET['courseid'])) {
    $courseid = $_GET['courseid'];
    // delete comments
    $filename = KARTAT_DIRECTORY."kommentit_".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    $deleted = FALSE;
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[0] == $courseid) {
        $deleted = TRUE;
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
    
    if (!$status) {
      $write["status_msg"] .= "Save error for kommentit. ";
    }

    // delete result records
    $filename = KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    $deleted = FALSE;
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      $deleted = FALSE;
      if ($data[1] == $courseid) {
        $deleted = TRUE;   
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
    
    if (!$status) {
      $write["status_msg"] .= "Save error for kilpailijat. ";
    }
   
    // delete route
    $deleted = FALSE;
    $filename = KARTAT_DIRECTORY."merkinnat_".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[0] == $courseid) {
        $deleted = TRUE;
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
  
    if (!$status) {
      $write["status_msg"] .= " Save error for merkinnat. ";
    }
    
    // delete course template
    $filename = KARTAT_DIRECTORY."radat_".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    $deleted = FALSE;
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[0] == $courseid) {
        $deleted = TRUE;
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
    
    if (!$status) {
      $write["status_msg"] .= "Save error for radat. ";
    }
    
    // delete course template
    $filename = KARTAT_DIRECTORY."ratapisteet_".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    $deleted = FALSE;
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[0] == $courseid) {
        $deleted = TRUE;
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
    
    if (!$status) {
      $write["status_msg"] .= "Save error for ratapisteet. ";
    }

    // delete course names
    $filename = KARTAT_DIRECTORY."sarjat_".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    $deleted = FALSE;
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[0] == $courseid) {
        $deleted = TRUE;
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
    
    if (!$status) {
      $write["status_msg"] .= "Save error for sarjat. ";
    } 
  
    // delete course control list
    $filename = KARTAT_DIRECTORY."sarjojenkoodit".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    $deleted = FALSE;
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[0] == $courseid) {
        $deleted = TRUE;
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
    
    if (!$status) {
      $write["status_msg"] .= "Save error for sarjojenkoodit. ";
    } 
            
  } else {
    $write["status_msg"] = "Invalid course id. ";
  }
  
  if ($write["status_msg"] == "") {
    $write["ok"] = TRUE;
    $write["status_msg"] = "Course deleted.";
    rg2log("Course deleted|".$eventid."|".$courseid);
  } else {
    $write["ok"] = FALSE;
  }
  
  return($write);
}

function deleteRoute($eventid) {
  $write["status_msg"] = "";
  
  // find event format
  $format = 0;
  $filename = KARTAT_DIRECTORY."kisat.txt";
  $oldfile = file($filename);
  foreach ($oldfile as $row) {
    $data = explode("|", $row);
    if ($data[0] == $eventid) {
      $format = $data[2];
      // exit loop now we have found what we want
      break;
    }
  } 
 
  if (isset($_GET['routeid'])) {
    $routeid = $_GET['routeid'];
    // delete comments
    $filename = KARTAT_DIRECTORY."kommentit_".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    $deleted = FALSE;
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[1] == $routeid) {
        $deleted = TRUE;
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
    
    if ($status === FALSE) {
      $write["status_msg"] .= "Save error for kommentit. ";
    }

    // delete result if this event started with no results (format 2)
    // delete GPS details since these are always added as a new result
    if (($routeid >= GPS_RESULT_OFFSET) || ($format == 2)) {
      $filename = KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt";
      $oldfile = file($filename);
      $updatedfile = array();
      foreach ($oldfile as $row) {
        $data = explode("|", $row);
        $deleted = FALSE;
        if ($data[0] == $routeid) {
          $deleted = TRUE;
        } else {
          $updatedfile[] = $row;
        }
      }
      $status = file_put_contents($filename, $updatedfile);
    
      if ($status === FALSE) {
        $write["status_msg"] .= "Save error for kilpailijat. ";
      }

    }
      
    // delete route
    $deleted = FALSE;
    $filename = KARTAT_DIRECTORY."merkinnat_".$eventid.".txt";
    $oldfile = file($filename);
    $updatedfile = array();
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[1] == $routeid) {
        $deleted = TRUE;
      } else {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents($filename, $updatedfile);
  
    if ($status === FALSE) {
      $write["status_msg"] .= " Save error for merkinnat. ";
    }
    if (!$deleted) {
      $write["status_msg"] .= "Invalid route id. ";
    }
  } else {
    $write["status_msg"] = "Invalid route id. ";
  }
  
  if ($write["status_msg"] == "") {
    $write["ok"] = TRUE;
    $write["status_msg"] = "Route deleted";
    rg2log("Route deleted|".$eventid."|".$routeid);
  } else {
    $write["ok"] = FALSE;
  }
  
  return($write);
}

function addNewRoute($eventid, $data) {
  //rg2log("Add new route for eventid ".$eventid);
  $newresult = FALSE;
  $id = $data->resultid;
  if (($data->resultid == 0) || ($data->resultid == GPS_RESULT_OFFSET)) {
    // result needs to be allocated a new id
    $newresult = TRUE;
    // allow for this being the first entry for an event with no results
    if (file_exists(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt")) {
      $rows = count(file(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt"));
    } else {
      $rows = 0;
    }
    $rows++;
    if ($data->resultid == 0) {
      $id = $rows;
    } else {
      $id = $rows + GPS_RESULT_OFFSET;
    }
  }

  $write["oldid"] = $data->resultid;
  $write["newid"] = $id;
  
  if ($id >= GPS_RESULT_OFFSET) {
    $name = ' GPS '.$data->name;
  } else {
    $name = $data->name;
  }
  //
  $name = encode_rg_output($name);
  // tidy up commments
  $comments = tidyNewComments($data->comments);
  $newcommentdata = $data->courseid."|".$id."|".$name."||".$comments.PHP_EOL;

  // convert x,y to internal RG format
  $track = "";
  for ($i = 0; $i < count($data->x); $i++) {
    $track .= 'N'.$data->x[$i].';-'.$data->y[$i];
  }

  $controls = "";
  for ($i = 0; $i < count($data->controlx); $i++) {
    $controls .= 'N'.$data->controlx[$i].';-'.$data->controly[$i];
  }
  
  $newtrackdata = $data->courseid."|".$id."|".$name."|null|".$track."|".$controls.PHP_EOL;

  $newresultdata = "";
  if (($newresult === TRUE) || ($id >= GPS_RESULT_OFFSET)) {
    // New result or GPS record so need to add result record as well
    // GPS track saved here as a point every three seconds
    // input can in theory have any time between points
    // so we need to interpolate
    $track= "";
    if ($id >= GPS_RESULT_OFFSET) {
      $oldtime = $data->time[0];
      $oldx = $data->x[0];
      $oldy = $data->y[0];
      $track = $data->x[0].';-'.$data->y[0].',0N';
      for ($i = 1; $i < count($data->x); $i++) {
        $difftime = $data->time[$i] - $oldtime;
        if ($difftime >= GPS_INTERVAL) {
          $xpersec = ($data->x[$i] - $oldx) / $difftime;
          $ypersec = ($data->y[$i] - $oldy) / $difftime;
          $time = GPS_INTERVAL;
          while ($time <= $difftime) {
            $track .= intval($oldx + ($xpersec * $time)).';-'.intval($oldy + ($ypersec * $time)).',0N';
            $time = $time + GPS_INTERVAL;
          }
          $oldx = intval($oldx + ($xpersec * $time));
          $oldy = intval($oldy + ($ypersec * $time));
          $oldtime = $oldtime + $time - GPS_INTERVAL;
        }
      }
    }
  
    $newresultdata = $id."|".$data->courseid."|".encode_rg_output($data->coursename)."|".$name;
    if ($id >= GPS_RESULT_OFFSET) {
      $newresultdata .= "|".$data->startsecs."|||".$data->totaltime."||".$track.PHP_EOL;
    } else {
      $newresultdata .= "|".$data->startsecs."|||".$data->totaltime."|".$data->totalsecs.";|".PHP_EOL;
    }
  }

  $write["status_msg"] = "";
  
  if (($handle = @fopen(KARTAT_DIRECTORY."kommentit_".$eventid.".txt", "a")) !== FALSE) {
    $status =fwrite($handle, $newcommentdata);
    if (!$status) {
      $write["status_msg"] = "Save error for kommentit. ";
    }
    @fflush($handle);
    @fclose($handle);
  }
  
  $filename = KARTAT_DIRECTORY."merkinnat_".$eventid.".txt";
  // don't report error if file doesn't exist yet
  $oldfile = @file($filename);
  // if we read something...
  if ($oldfile) {
    $updatedfile = array();
    // copy each existing row to output file
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      // but not if it is a drawn route for the current result
      if (($data[1] != $id) || ($data[1] >= GPS_RESULT_OFFSET)) {
        $updatedfile[] = $row;
      }
    }
  }
  // add new track at end of file
  $updatedfile[] = $newtrackdata;
  
  $status = file_put_contents($filename, $updatedfile);
 
  if (!$status) {
    $write["status_msg"] .= " Save error for merkinnat. ";
  }

  if (($newresult === TRUE) || ($id >= GPS_RESULT_OFFSET)) {
    if (($handle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", "a")) !== FALSE) {
      $status =fwrite($handle, $newresultdata);
      if (!$status) {
        $write["status_msg"] .= " Save error for kilpailijat.";
      }
      @fflush($handle);
      @fclose($handle);
    }
  }

  if ($write["status_msg"] == "") {
    $write["ok"] = TRUE;
    $write["status_msg"] = "Record saved";
    //rg2log("Route saved|".$eventid."|".$id);
  } else {
    $write["ok"] = FALSE;
  }
  
  return $write;

}

function addNewMap($data) {
  $write["status_msg"] = "";
  if (($handle = @fopen(KARTAT_DIRECTORY."kartat.txt", "r+")) !== FALSE) {
    // read to end of file to find last entry
    $oldid = 0;
    while (($olddata = fgetcsv($handle, 0, "|")) !== FALSE) {
      if (count($olddata) > 0) {
        $oldid = intval($olddata[0]);
      }
    }
    $newid = $oldid + 1;
  } else {
  // create empty kartat file
  $newid = 1;
  $handle = @fopen(KARTAT_DIRECTORY."kartat.txt", "w+");
  }
  // may not have a GIF
  if (file_exists(KARTAT_DIRECTORY."temp.gif")) {
    $renameGIF = rename(KARTAT_DIRECTORY."temp.gif", KARTAT_DIRECTORY.$newid.".gif");
  } else {
    $renameGIF = TRUE;
  }
  // always need a JPG for original Routegadget to maintain backward compatibility 
  $renameJPG = rename(KARTAT_DIRECTORY."temp.jpg", KARTAT_DIRECTORY.$newid.".jpg");
  
  if (($renameJPG && $renameGIF)) {
    $newmap = $newid."|".encode_rg_output($data->name);
    if ($data->worldfile->valid) {
      $newmap .= "|".$data->xpx[0]."|".$data->lon[0]."|".$data->ypx[0]."|".$data->lat[0];
      $newmap .= "|".$data->xpx[1]."|".$data->lon[1]."|".$data->ypx[1]."|".$data->lat[1];
      $newmap .= "|".$data->xpx[2]."|".$data->lon[2]."|".$data->ypx[2]."|".$data->lat[2];
    }
    if ($data->localworldfile->valid) {
      // save local worldfile for use in aligning georeferenced courses
      $wf =$data->localworldfile->A.",".$data->localworldfile->B.",".$data->localworldfile->C.",".$data->localworldfile->D.",".$data->localworldfile->E.",".$data->localworldfile->F.PHP_EOL;
      @file_put_contents(KARTAT_DIRECTORY."worldfile_".$newid.".txt", $wf);
    }

    $newmap .= PHP_EOL;
    $write["newid"] = $newid;
    $status =fwrite($handle, $newmap);
    if (!$status) {
      $write["status_msg"] = "Save error for kartat. ";
    }
  } else {
      $write["status_msg"] = "Error renaming map file. ";
  }
  @fflush($handle);
  @fclose($handle);
  
  if ($write["status_msg"] == "") {
    $write["ok"] = TRUE;
    $write["status_msg"] = "Map added";
    rg2log("Map added|".$newid);
  } else {
    $write["ok"] = FALSE;
  }
  
  return $write;

}

function lockDatabase() {
    // lock directory version based on http://docstore.mik.ua/oreilly/webprog/pcook/ch18_25.htm
    // but note mkdir returns TRUE if directory already exists!
    $locked = FALSE;
    
    // tidy up from possible locking errors
    if (is_dir(LOCK_DIRECTORY)) {
      // if lock directory is more than a few seconds old it wasn't deleted properly, so we'll delete it ourselves
      // not sure exactly how time changes work, but we can live with a possible twice
      // a year problem since locking is probably almost never needed
      if ((time() - filemtime(LOCK_DIRECTORY)) > 15) {
        unlockDatabase();
      }
    }
    if (is_dir(LOCK_DIRECTORY)) {
      // locked already by someone else
      //rg2log("Directory exists ".date("D M j G:i:s T Y", filemtime(LOCK_DIRECTORY)));
    } else {
      // try to lock it ourselves
     //rg2log("Trying to lock");
      $locked = mkdir(LOCK_DIRECTORY ,0777);
    }
    $tries = 0;
    while (!$locked && ($tries < 5)) {
      // wait 500ms up to 5 times trying to get a lock
      usleep(500000);
      if (is_dir(LOCK_DIRECTORY)) {
        // locked already by someone else
        $locked = FALSE;
      } else {
        // try to lock it ourselves
        $locked = mkdir(LOCK_DIRECTORY,0777);
      }
      $tries++;
      //rg2log("Lock attempt ".$tries);
  }
  //rg2log("Lock status ".$locked);
  return $locked;
}

function unlockDatabase() {
  // ignore any errors but try to tidy up everything
  @rmdir(LOCK_DIRECTORY);
}

function handleGetRequest($type, $id) {
  validateCache($id);
  $output = array();
  //rg2log("Type ".$type."|ID ".$id);
  switch ($type) {
  case 'events':
    if (file_exists(CACHE_DIRECTORY."events.json")) {
      $output = file_get_contents(CACHE_DIRECTORY."events.json");
    } else {
      // FALSE = don't include stats in output
      $output = getAllEvents(FALSE);
      @file_put_contents(CACHE_DIRECTORY."events.json", $output);
    }  
    break;
  case 'stats':
    if (file_exists(CACHE_DIRECTORY."stats.json")) {
      $output = file_get_contents(CACHE_DIRECTORY."stats.json");
    } else {
      // TRUE = do include stats in output
      $output = getAllEvents(TRUE);
      @file_put_contents(CACHE_DIRECTORY."stats.json", $output);
    } 
    break;
  case 'courses':
    if (file_exists(CACHE_DIRECTORY."courses_".$id.".json")) {
      $output = file_get_contents(CACHE_DIRECTORY."courses_".$id.".json");
    } else {
      $output = getCoursesForEvent($id);
      @file_put_contents(CACHE_DIRECTORY."courses_".$id.".json", $output);
    }    
    break;
  case 'results':
    if (file_exists(CACHE_DIRECTORY."results_".$id.".json")) {
      $output = file_get_contents(CACHE_DIRECTORY."results_".$id.".json");
    } else {
      $output = getResultsForEvent($id);
      @file_put_contents(CACHE_DIRECTORY."results_".$id.".json", $output);
    }
    break;
  case 'maps':
    $output = getMaps();
    break;
  case 'tracks':
    if (file_exists(CACHE_DIRECTORY."tracks_".$id.".json")) {
      $output = file_get_contents(CACHE_DIRECTORY."tracks_".$id.".json");
    } else {
      $output = getTracksForEvent($id);
      @file_put_contents(CACHE_DIRECTORY."tracks_".$id.".json", $output);
    }      
    break;
  case 'lang':
    $output = getLanguage($id);
    break;
  case 'splitsbrowser':
    $output = getSplitsbrowser($id);
    break;
  default:
    rg2log("Get request not recognised: ".$type.", ".$id);
    $output = json_encode("Request not recognised.");
    break;
  }
  if ($type == 'splitsbrowser') {
    echo $output;
  } else {
    // output JSON data
    header("Content-type: application/json");
    echo "{\"data\":" .$output. "}";
  }
}

function validateCache($id) {
  // check nothing has happened that could invalidate the cache if it exists
  // RG2 should tidy up for itself but
  // 1) delete cache if this is a new version of the API just in case
  // 2) delete cache if associated txt files have changed: probably someone using RG1
  if (!file_exists(KARTAT_DIRECTORY.'/cache')) {
    //rg2log("No cache directory");
    return;
  }
  
  $apitimestamp = filemtime(__FILE__);
  //rg2log("API file mod date ".$apitimestamp);
  $cachedirtimestamp = filemtime(CACHE_DIRECTORY.'.');
  //rg2log("Cache dir mod date ".$cachedirtimestamp);
  if ($apitimestamp >= $cachedirtimestamp) {
    //rg2log("Flush cache: API script file has been updated");
    @array_map('unlink', glob(CACHE_DIRECTORY."*.json"));
    return;
  }
  // catches events added via RG1 manager, which has been seen to happen
  // delete everything just to be sure
  if (is_file(KARTAT_DIRECTORY.'kisat.txt')) {
    if (filemtime(KARTAT_DIRECTORY.'kisat.txt') >= $cachedirtimestamp) {
        rg2log("Flush cache: kisat.txt file has been updated");
        @array_map('unlink', glob(CACHE_DIRECTORY."*.json"));
        return;
    }
  }
  
  // catches routes added via RG1 to an event with RG2 installed which is conceivable but very unlikely
  // base decision on kilpailijat only which seems reasonable enough
  if ((is_file(CACHE_DIRECTORY.'results_'.$id.'.json')) && is_file(KARTAT_DIRECTORY.'kilpailijat_'.$id.'.txt')) {
    if (filemtime(KARTAT_DIRECTORY.'kilpailijat_'.$id.'.txt') >= filemtime(CACHE_DIRECTORY.'results_'.$id.'.json')) {
        //rg2log("Flush cache for event id ".$id);
        @unlink(CACHE_DIRECTORY."results_".$id.".json");
        @unlink(CACHE_DIRECTORY."courses_".$id.".json");
        @unlink(CACHE_DIRECTORY."tracks_".$id.".json");
        @unlink(CACHE_DIRECTORY."events.json");
        @unlink(CACHE_DIRECTORY."stats.json");
        return;
    }
  }
    
  //rg2log("Cache OK");
}

function getSplitsbrowser($eventid) {
    $page = file_get_contents("html/splitsbrowser.html");
    $eventname = getEventName($eventid);
    $page = str_replace('<EVENT_NAME>', $eventname, $page);
    if (defined('DEBUG')) {
      $page = str_replace('DEBUG_CLOSE', "", $page);
      $page = str_replace('DEBUG', "", $page);
      $page = str_replace('MINIFIED_CLOSE', "--", $page);
      $page = str_replace('MINIFIED', "!--", $page);
    } else {
      $page = str_replace('DEBUG_CLOSE', "--", $page);
      $page = str_replace('DEBUG', "!--", $page);
      $page = str_replace('MINIFIED_CLOSE', "", $page);
      $page = str_replace('MINIFIED', "", $page);
    }
    $page = str_replace('<SPLITSBROWSER_DIRECTORY>', SPLITSBROWSER_DIRECTORY, $page);
    $result_data = getResultsCSV($eventid);
    $page = str_replace('<SPLITSBROWSER_DATA>', $result_data, $page);
    return $page;
}

function getLanguage($lang) {
  $langdir = dirname(__FILE__) . '/lang/';
  $dict = array();
  if (file_exists($langdir.$lang.'.txt')) {
    // generate the necessary php array from the txt file
    $lines = file($langdir.$lang.'.txt');
    // extract each string pair into php array
    foreach ($lines as $line) {
      // remove all quotation marks
      $line = str_replace("'", "", $line);
      // split into two bits
      $temp = explode(":", trim($line));
      // remove trailing comma
      if (count($temp) == 2) {
        $temp[1] = rtrim($temp[1], ',');
        $dict[trim($temp[0])] = trim($temp[1]);
      }
    }
  }
  return addVersion('dict', $dict);
}

// formats results as needed for Splitsbrowser
function getResultsCSV($eventid) {
  $result_data = "\n'Headers;\\n' + \n";
  $first_line = true;
  $coursecount = 0;
  $courses = array();
  $controls = array();
  // read control codes for each course: use hajontakanta if it exists
  if (($handle = @fopen(KARTAT_DIRECTORY."hajontakanta_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
     $courses[$coursecount] = $data[0];
     $codes =  explode("_", $data[2]);
     $controls[$coursecount] = $codes;
     $coursecount++;
    }
    fclose($handle);
  }
  // try sarjojenkoodit if we didn't find anything
  if ($coursecount == 0) {
    if (($handle = @fopen(KARTAT_DIRECTORY."sarjojenkoodit_".$eventid.".txt", "r")) !== FALSE) {
      while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
       $courses[$coursecount] = $data[0];
       $codes = array();
       // ignore start and finish: just need control codes
       for ($j = 2; $j < (count($data) - 1); $j++) {
          $codes[$j - 2] = $data[$j];
       }
       $controls[$coursecount] = $codes;
       $coursecount++;
      }
      fclose($handle);
    }
  }
  // shouldn't get a request for non-existent event but it seems to happen...#266
  $results = array();
  if (file_exists(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt")) {
    $results = file(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt");
  }
  foreach ($results as $result) {
    $data = explode("|", $result);
    // extract time
    $t = tidyTime($data[7]);
    if (intval($data[0]) < GPS_RESULT_OFFSET) {
      if ($first_line) {
        $first_line = false;
      } else {
        $result_data .= " +\n";
      }
      // 0-based column indexes
      // 0: startno, so use resultid
      $result_data .= "'".intval($data[0]).";;;";
      // 3: surname
      // escape apostrophe in names
      $name = str_replace("'", "\'", $data[3]);
      $result_data .= $name.";;;;;;";
      // 9: start time
      $result_data .= convertSecondsToHHMMSS(intval($data[4])).";;";
      // 11: time
      if ($t == "0:00:00") {
        $result_data .= "---;;;;;;;";
      } else {
        $result_data .= $t.";;;;;;;";
      }
      // 18: course name
      $result_data .= encode_rg_input($data[2]).";;;;;;;;;;;;;;;;;;;;";
      // find codes for this course
      if ($data[6] !== '') {
        $variant = $data[6];
      } else {
        $variant = $data[1];
      }
      $courseindex = -1;
      for ($i = 0; $i < $coursecount; $i++) {
        if ($courses[$i] == $variant) {
          $courseindex = $i;
          break;
        }
      }
      // 38: course number, 39: course name
      $result_data .= intval($data[1]).";".$data[2].";;;";
      // trim trailing ; which create null fields when expanded
      $temp = rtrim($data[8], ";");
      // split array at ; and force to integers
      $splits = array_map('intval', explode(";", $temp));
      // 42: control count, 44 start time
      // RG2 has finish split, but Splitsbrowser doesn't need it
      $split_count = count($splits) -  1;
      $result_data .= $split_count.";;".convertSecondsToHHMMSS(intval($data[4])).";";
      // 45: finish time
      if ($split_count > 0) {
        $finish_secs = intval($splits[$split_count - 1]) + intval($data[4]);
      } else {
        $finish_secs = intval($data[4]);
      }
      if ($finish_secs == 0) {
        // #155: send invalid rather than 0 times to Splitsbrowser
        $result_data .= "---;";
      } else {
        $result_data .= convertSecondsToHHMMSS($finish_secs).";";
      }
      if ($courseindex > -1) {
        $controlcount = count($controls[$courseindex]);
      } else {
        $controlcount = 0;
      }
      for ($i = 0; $i < $split_count; $i++) {
        // 46: control 1 number
        if ($courseindex > -1) {
          if ($i < $controlcount) {
            $result_data .= $controls[$courseindex][$i].";";
           } else {
             $result_data .= "XXX;";
           }
        } else {
          $result_data .= ($i + 1).";";
        }
        // 47: control 1 split
        // #155: send invalid rather than 0 times to Splitsbrowser
        if ($splits[$i] == 0) {
          $result_data .= "---;";
        } else {
          $result_data .= convertSecondsToMMSS($splits[$i]).";";
        }
      }
      $result_data .= "\\n'";
    }
  }
  $result_data .= ";";
  $result_data = str_replace("&amp;", "\&", $result_data);
  if ($first_line) {
    // we didn't find any results
    $results_data = "";
  }
  return $result_data;
}

function convertSecondsToHHMMSS($seconds) {
  $hours = floor($seconds / 3600);
  $mins = floor(($seconds - ($hours*3600)) / 60);
  $secs = floor($seconds % 60);
  return sprintf('%02d:%02d:%02d', $hours, $mins, $secs);;
}

function convertSecondsToMMSS($seconds) {
  $mins = floor($seconds / 60);
  $secs = floor($seconds % 60);
  return sprintf('%d:%02d', $mins, $secs);;
}

function getEventName($eventid) {
  $event_name = "Unknown event";
  $events = file(KARTAT_DIRECTORY."kisat.txt");
  foreach ($events as $event) {
    $data = explode("|", $event);
    if (intval($data[0]) == $eventid) {
      $event_name = encode_rg_input($data[3])." on ".$data[4];
    };
  }
  return $event_name;
}

function getAllEvents($includeStats) {
  $output = array();
  $referenced = 0;
  $maps = array();
  if (($handle = @fopen(KARTAT_DIRECTORY."kartat.txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      if (count($data) == 14) {
        list($A, $B, $C, $D, $E, $F) = generateWorldFile($data);
        // make sure it worked OK
        if (($E != 0) && ($F != 0)) {
          $maps[$referenced]["mapid"] = intval($data[0]);
          $maps[$referenced]["A"] = $A;
          $maps[$referenced]["D"] = $D;
          $maps[$referenced]["B"] = $B;
          $maps[$referenced]["E"] = $E;
          $maps[$referenced]["C"] = $C;
          $maps[$referenced]["F"] = $F;
          $referenced++;
        }
      }
    }
    fclose($handle);
  }

  $row = 0;
  if (($handle = @fopen(KARTAT_DIRECTORY."kisat.txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $detail = array();
      $fields = count($data);
      if ($fields < 7) {
        // not enough fields to be a valid line
        continue;
      }
      $detail["id"] = intval($data[0]);
      $detail["mapid"] = intval($data[1]);
      if (file_exists(KARTAT_DIRECTORY.$detail["mapid"].'.gif')) {
        $detail["suffix"] = 'gif';
      }
      for ($i = 0; $i < $referenced; $i++) {
        if ($detail["mapid"] == $maps[$i]["mapid"]) {
          $detail["A"] = $maps[$i]["A"];
          $detail["B"] = $maps[$i]["B"];
          $detail["C"] = $maps[$i]["C"];
          $detail["D"] = $maps[$i]["D"];
          $detail["E"] = $maps[$i]["E"];
          $detail["F"] = $maps[$i]["F"];
        }
      }

      $detail["format"] = intval($data[2]);
      // Issue #11: found a stray &#39; in a SUFFOC file
      $name = encode_rg_input($data[3]);
      $detail["name"] = str_replace("&#39;", "'", $name);
      // and stray &amp;#39; in a CHIG file
      $detail["name"] = str_replace("&amp;#39;", "'", $name);
      $detail["date"] = $data[4];
      if ($fields > 5) {
        $detail["club"] = encode_rg_input($data[5]);
      } else {
        $detail["club"] = "";
      }
      if ($fields > 6) {
        $detail["type"] = $data[6];
      } else {
        $detail["type"] = "X";
      }
      if ($fields > 7) {
        $detail["comment"] = formatCommentsForOutput($data[7]);
      } else {
        $detail["comment"] = "";
      }
      
      if ($includeStats) {
        // avoid reading big results file into memory: has been seen to cause trouble
        if (($resulthandle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$detail["id"].".txt", "r")) !== FALSE) {
          $count = 0;
          while (($data = fgetcsv($resulthandle, 0, "|")) !== FALSE) {
            // don't double-count GPS results
            if (count($data) > 0) {
              if ($data[0] < GPS_RESULT_OFFSET) {
                $count++;
              } else {
                continue;
              }
            }
          }
          fclose($resulthandle);
          $detail["results"] = $count;
        } else {
          $detail["results"] = 0;
        }
        if (file_exists(KARTAT_DIRECTORY."sarjat_".$detail["id"].".txt")) {
          $detail["courses"] = count(file(KARTAT_DIRECTORY."sarjat_".$detail["id"].".txt"));
        } else {
          $detail["courses"] = 0;
        }
        if (file_exists(KARTAT_DIRECTORY."kommentit_".$detail["id"].".txt")) {
          $detail["routes"] = count(file(KARTAT_DIRECTORY."kommentit_".$detail["id"].".txt"));
        } else {
          $detail["routes"] = 0;
        }
      }

      $output[$row] = $detail;
      $row++;
    }
    fclose($handle);
  }
  usort($output, "sortEventsByDate");
  return addVersion('events', $output);
}

function addVersion($name, $data) {
  $a[$name] = $data;
  $a['API version'] = RG2VERSION;
  return json_encode($a);
}

function sortEventsByDate($a, $b) {
  return strcmp($a["date"], $b["date"]);
}

function getMaps() {
  $output = array();
  $row = 0;
  if (($handle = @fopen(KARTAT_DIRECTORY."kartat.txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $detail = array();
      if (count($data) > 1) {
        $detail["mapid"] = intval($data[0]);
        $detail["name"] = encode_rg_input($data[1]);
        // defaults to jpg so only need to say if we have something else as well
        if (file_exists(KARTAT_DIRECTORY.$detail['mapid'].'.gif')) {
          $detail["mapfilename"] = $detail['mapid'].'.gif';
        }
        $detail["georeferenced"] = FALSE;
        if (count($data) == 14) {
          list($A, $B, $C, $D, $E, $F) = generateWorldFile($data);
          $detail["A"] = $A;
          $detail["B"] = $B;
          $detail["C"] = $C;
          $detail["D"] = $D;
          $detail["E"] = $E;
          $detail["F"] = $F;
          list($localA, $localB, $localC, $localD, $localE, $localF) = generateLocalWorldFile($data);
          $detail["localA"] = $localA;
          $detail["localB"] = $localB;
          $detail["localC"] = $localC;
          $detail["localD"] = $localD;
          $detail["localE"] = $localE;
          $detail["localF"] = $localF;
          // make sure it worked OK
          if (($E != 0) && ($F != 0)) {
            $detail["georeferenced"] = TRUE;
          }
        }
      $output[$row] = $detail;
      $row++;
      }
    }
    fclose($handle);
    }
  return addVersion('maps', $output);
}

function isScoreEvent($eventid) {
  if (($handle = @fopen(KARTAT_DIRECTORY."kisat.txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      if ($data[0] == $eventid) {
        if ($data[2] == 3) {
          return TRUE;
        } else {
          return FALSE;
        }
      }
    }
  }
  return FALSE;
}

function getResultsForEvent($eventid) {
  rg2log("Get results for event ".$eventid);
  $output = array();
  $comments = 0;
  $text = array();
  // @ suppresses error report if file does not exist
  if (($handle = @fopen(KARTAT_DIRECTORY."kommentit_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      if (count($data) >= 5) {
        // remove null comments
        if (!isDefaultComment($data[4])) {
           $text[$comments]["resultid"] = $data[1];
           $text[$comments]["comments"] = formatCommentsForOutput($data[4]);
           $comments++;
        }
      }
    }
    fclose($handle);
  }
  $codes = array();
  // initialise empty to deal with corrupt results files that occur sometimes
  $variant = array();
  if (isScoreEvent($eventid)) {
    // read control locations visited: this includes start and finish
    if (($handle = @fopen(KARTAT_DIRECTORY."ratapisteet_".$eventid.".txt", "r")) !== FALSE) {
      $row = 0;
      while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
        $x = array();
        $y = array();
        $tempcodes = array();
        // field is N separated and then comma separated
        $pairs = explode("N", $data[1]);
        for ($j = 0; $j < count($pairs); $j++) {
          $xy = explode(";", $pairs[$j]);
          // some courses seem to have nulls at the end so just ignore them
          if ($xy[0] != "") {
            $x[$j] = 1 * $xy[0];
            // make it easier to draw map
            $y[$j] = -1 * $xy[1];
            // needs to be a string for javascript
            $tempcodes[$j] = strval($j);
          }
         }
        $variant[$row] = $data[0];
        $xpos[$row] = $x;
        $ypos[$row] = $y;
        $codes[$row] = $tempcodes;
        $sentalready[$row] = false;
        $row++;
      }
      fclose($handle);
    }
    // read control codes visited
    if (($handle = @fopen(KARTAT_DIRECTORY."hajontakanta_".$eventid.".txt", "r")) !== FALSE) {
      // if file exists then we can delete the old codes list and get the real one
      unset($codes);
      $codes = array();
      $row = 0;
      while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
        $allcodes =  explode("_", $data[2]);
        // add start at beginning of array
        array_unshift($allcodes, "S");
        // add finish at end of array
        array_push($allcodes, "F");
        $codes[$row] = $allcodes;
        $row++;
      }
      fclose($handle);
    }
  }
  // @ suppresses error report if file does not exist
  if (($handle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", "r")) !== FALSE) {
    $row = 0;
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $detail = array();
      $resultid = intval($data[0]);
      $courseid = intval($data[1]);
      // protect against corrupt/invalid files
      // skip this record and go to next line
      if (($resultid < 1) || ($courseid < 1)) {
        continue;  
      }
      $detail["resultid"] = $resultid;
      $detail["courseid"] = $courseid;
      $detail["coursename"] = encode_rg_input($data[2]);
      $detail["name"] = trim(encode_rg_input($data[3]));
      $detail["starttime"] = intval($data[4]);
      $detail["position"] = '';
      $detail["status"] = '';
      // look for RG2 extra fields in dbid
      $databaseid = encode_rg_input($data[5]);
      $pos = strpos($databaseid, "_#");
      if ($pos) {
        $extras = explode("#", substr($databaseid, $pos + 2));
        if (count($extras) == 2) {
          $detail["position"] = $extras[0];
          $detail["status"] = $extras[1];
        }
      }
      // score event check should be redundant but see issue #159
      if (($data[6] != "") && isScoreEvent($eventid)) {
        $detail["variant"] = intval($data[6]);
        for ($i = 0; $i < count($variant); $i++) {
          // only send course details the first time they occur: makes response a lot smaller for big (Jukola!) relays
          if ($variant[$i] == $data[6]) {
            if (!$sentalready[$i]) {
              $detail["scorex"] = $xpos[$i];
              $detail["scorey"] = $ypos[$i];
              $detail["scorecodes"] = $codes[$i];
              $sentalready[$i] = true;
            }
          }
        }
      }
      $detail["time"] = tidyTime($data[7]);;
      // trim trailing ;which create null fields when expanded
      $temp = rtrim($data[8], ";");
      // split array at ;and force to integers
      $detail["splits"] = array_map('intval', explode(";", $temp));
      //$detail["comments"] = "";
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
  return addVersion('results', $output);
}

function getCoursesForEvent($eventid) {
  $output = array();
  $row = 0;
  // extract control codes
  $controlsFound = FALSE;
  $controls = array();
  $xpos = array();
  $ypos = array();
  $dummycontrols = array();
  // @ suppresses error report if file does not exist
  // read control codes for each course
  if (($handle = @fopen(KARTAT_DIRECTORY."sarjojenkoodit_".$eventid.".txt", "r")) !== FALSE) {
    $controlsFound = TRUE;
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
  if (($handle = @fopen(KARTAT_DIRECTORY."ratapisteet_".$eventid.".txt", "r")) !== FALSE) {
    $row = 0;
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      // ignore first field: it is an index  
      $x = array();
      $y = array();
      $dummycodes = array();
      // field is N separated and then semicolon separated
      $pairs = explode("N", $data[1]);
      for ($j = 0; $j < count($pairs); $j++) {
        $xy = explode(";", $pairs[$j]);
        // some courses seem to have nulls at the end so just ignore them
        if ($xy[0] != "") {
          $dummycodes[$j] = getDummyCode($pairs[$j]);
          $x[$j] = 1 * $xy[0];
          // make it easier to draw map
         $y[$j] = -1 * $xy[1];
        }
      }
      $xpos[$row] = $x;
      $ypos[$row] = $y;
      $dummycontrols[$row] = $dummycodes;
      $row++;
    }
    fclose($handle);
  }

  $row = 0;
  // set up details for each course
  if (($handle = @fopen(KARTAT_DIRECTORY."sarjat_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $detail = array();
      $detail["courseid"] = intval($data[0]);
      $detail["name"] = encode_rg_input($data[1]);
      // sarjojenkoodit quite often seems to have things missing for old RG1 events so protect against it
      if (($controlsFound) && (count($controls) > $row)) {
        $detail["codes"] = $controls[$row];
      } else {
        $detail["codes"] = $dummycontrols[$row];
      }
      // some RG1 events seem to have unused courses which cause trouble
      if (count($xpos) > $row) {
        $detail["xpos"] = $xpos[$row];
        $detail["ypos"] = $ypos[$row];
      } else {
        $detail["xpos"] = array();
        $detail["ypos"] = array();
      }
      $output[$row] = $detail;
      $row++;
    }
    fclose($handle);
  }
  return addVersion('courses', $output);
}

function expandCoords($coords) {
  // Split Nxx;-yy,0Nxxx;-yy,0N.. into x,y arrays
  // but note that sometimes you don't get the ,0

  // handle empty coord string: found some examples in Jukola files
  // 5 is enough for one coordinate set, but the problem files just had "0"
  if (strlen($coords) < 5) {
    return array("", "");
  }
  $xy = explode("N", $coords);
  $x = array();
  $y = array();
  foreach ($xy as $point) {
    $temp = explode(";", $point);
    if (count($temp) == 2) {
      $x[] = $temp[0];
      // strip off trailing ,0 if it exists
      $pos = strpos($temp[1], ",");
      if ($pos !== FALSE) {
        // remove leading - by starting at 1
        $y[] = substr($temp[1], 1, $pos - 1);
      } else {
        $y[] = substr($temp[1], 1);
      }
    }
  }
  // send as differences rather than absolute values: provides almost 50% reduction in size of json file
  for ($i = (count($x) - 1); $i > 0; $i--) {
    $x[$i] = $x[$i] - $x[$i - 1];
    $y[$i] = $y[$i] - $y[$i - 1];
  }
  
  // return the two arrays as comma-separated strings
  // used to return as integer arrays, but this caused memory problems in json_encode
  return array(implode(",", $x), implode(",", $y));
}

function getDummyCode($code) {
  // create dummy control codes if the results didn't include any
  static $codes = array();
  static $count = 0;
  $dummycode = 0;
  for ($i = 0; $i < $count; $i++) {
    if ($codes[$i] == $code) {
      $dummycode = $i + 1;
    }
  }
  if ($dummycode == 0) {
    $codes[$count] = $code;
    $count++;
    $dummycode = $count;
  }
  //rg2log($code.' becomes '.$dummycode);
  // force to a string since it helps elsewhere and it shows that these are dummy values
  return 'X'.$dummycode;
  
}

function getTracksForEvent($eventid) {
  $output = array();
  // read drawn tracks from merkinnat file
  if (($handle = @fopen(KARTAT_DIRECTORY."merkinnat_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      $courseid = intval($data[0]);
      $resultid = intval($data[1]);
      // protect against corrupt/invalid files
      // GPS tracks are taken from another file so don't add them here
      if (($resultid > 0) && ($resultid < GPS_RESULT_OFFSET) && ($courseid > 0)) {
        $detail = array();
        $detail["id"] = $resultid;
        list($detail["x"], $detail["y"]) = expandCoords($data[4]);
        $output[] = $detail;
      }
    }
    fclose($handle);
  }
  // send GPS tracks from kilpailijat file, where they are correctly stored at 3 second intervals
  if (($handle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
      // only need to do this if the result includes GPS details
      $resultid = intval($data[0]);
      if ((count($data) > 9) && ($resultid >= GPS_RESULT_OFFSET)) {
        $courseid = intval($data[1]);
        // protect against corrupt/invalid files
        // skip this record and go to next line
        if (($resultid > 0) && ($courseid > 0)) {
          $detail = array();
          $detail["id"] = $resultid;
          // list allocates return values in an array to the specified variables 
          list($detail["x"], $detail["y"]) = expandCoords($data[9]);
          $output[] = $detail;
        }
      }
    }
    fclose($handle);
  }
  return addVersion('routes', $output);
}

function tidyTime($in) {
  // takes what should be a time as mm:ss or hh:mm:ss and tidies it up
  // remove ".:" and "::" which RG1 can generate when adding results
  $t = str_replace('.:', ':', $in);
  $t = str_replace('::', ":", $t);
  // remove leading 0:
  if (substr($t, 0, 2) === '0:') {
    $t = substr($t, 2);
  }
  // correct seconds for missing leading 0 which RG1 can generate from Emit. e.g 25:9 becomes 25:09
  $secs = substr($t, -2);
  if (substr($secs, 0, 1) ===  ':') {
    $t = substr_replace($t, '0', -1, 0);
  }
  return $t;
}

function tidyNewComments($inputComments) {
  $comments = trim($inputComments);
  // remove HTML tags: probably not needed but do it anyway
  $comments = strip_tags($comments);
  // remove line breaks and keep compatibility with RG1
  $comments = str_replace("\r", "", $comments);
  $comments = str_replace("\n", "#cr##nl#", $comments);
  $comments = encode_rg_output($comments);
  return $comments;
}

function isDefaultComment($comment) {
  // returns true if the comment matches a list of possible default comments
  // add new strings as necessary
  $defaults = array('Type your comment', 'Dein Kommentar', 'Kirjoita kommentti', 'Kirjoita kommentit tähän', 'Votre commentaire', 'Kommenter');
  for ($i = 0; $i < count($defaults); $i++) {
    if (strcmp($defaults[$i], $comment) == 0) {
      return true;
    }
  }
  return false;
}

function formatCommentsForOutput($inputComments) {
  // replace carriage return and line break codes
  $comments = encode_rg_input($inputComments);
  // RG1 uses #cr##nl# and #nl# to allow saving to text file
  $comments = str_replace("#cr##nl#", "\n", $comments);
  $comments = str_replace("#nl#", "\n", $comments);
  $comments = str_replace("<br>", "\n", $comments);
  return $comments;
}

function rg2log($msg) {
  if (defined('RG_LOG_FILE')){
    if( ! ini_get('date.timezone') ) {
     date_default_timezone_set('GMT');
    }
    error_log(date("c", time())."|".$msg.PHP_EOL, 3, RG_LOG_FILE);
    if (filesize(RG_LOG_FILE) > 500000) {
      rename(RG_LOG_FILE, RG_LOG_FILE."-".date("Y-m-d-His", time()));
    }
  }
}

function generateCookie() {
  // simple cookie generator! Don't need unique, just need something vaguely random
  $keksi = substr(str_shuffle("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"), 0, 20);
  // overwrite old cookie file  
  //TODO add error check
  file_put_contents($manager_url."keksi.txt", $keksi);
  return $keksi;
}

function generateLocalWorldFile($data) {
  // looks for local worldfile
  $file = KARTAT_DIRECTORY."worldfile_".intval($data[0]).".txt";
  $temp = array();
  if (file_exists($file)) {
    $wf = trim(file_get_contents($file));
    $temp = explode(",", $wf);
  }
  if (count($temp) == 6) {
    return array($temp[0], $temp[1], $temp[2], $temp[3], $temp[4], $temp[5]);
  } else {
    return array(0, 0, 0, 0, 0, 0);
  }
}

function generateWorldFile($data) {
  // takes three georeferenced points in a kartat row and converts to World File format
  for ($i = 0; $i < 3; $i++) {
    $x[$i] = intval($data[2 + ($i * 4)]);
    $lon[$i] = floatval($data[3 + ($i * 4)]);
    $y[$i] = intval($data[4 + ($i * 4)]);
    $lat[$i] = floatval($data[5 + ($i * 4)]);
    //rg2log($data[0].", ".$lat[$i].", ".$lon[$i].", ".$x[$i].", ".$y[$i]);
  }
  // assumes various things about the three points
  // works for RG2, may not work for the original, but we can live with that
  // idealy we would have saved the world file rather than three points
  if (($x[0]!== 0) || ($y[0] !== 0) || ($y[2] !== 0) || ($x[2] === 0)) {
    return array(0, 0, 0, 0, 0, 0);
  }

  // X = Ax + By + C, Y = Dx + Ey + F
  // C = X - Ax - By, where x and y are 0
  $C = $lon[0];
  // F = Y - Dx - Ey, where X and Y are 0
  $F = $lat[0];
  // A = (X - By - C) / x where y = 0
  $A = ($lon[2] - $C) / $x[2];
  // B = (X - Ax - C) / y
  $B = ($lon[1] - ($A * $x[1]) - $C) / $y[1];
  // D = (Y - Ey - F) / x where y = 0
  $D = ($lat[2] - $F) / $x[2];
  // E = (Y - Dx - F) / y
  $E = ($lat[1] - ($D * $x[1]) -  $F) / $y[1];

  return array($A, $B, $C, $D, $E, $F);
}

/**
 * @return distance in metres between two points
*/
function getLatLonDistance($lat1, $lon1, $lat2, $lon2) {
  // Haversine formula (http://www.codecodex.com/wiki/Calculate_distance_between_two_points_on_a_globe)
  //echo $lat1, " ", $lon1, " ",$lat2, " ",$lon2, "<br />";
  $dLat = deg2rad($lat2 - $lat1);
  $dLon = deg2rad($lon2 - $lon1);
  $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
  $c = 2 * asin(sqrt($a));
  // multiply by IUUG earth mean radius (http://en.wikipedia.org/wiki/Earth_radius) in metres
  return 6371009 * $c;
}
