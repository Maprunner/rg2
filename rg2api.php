<?php
  require_once( dirname(__FILE__) . '/rg2-config.php' );
  // override allows testing of a local configuration such as c:/xampp/htdocs/rg2
  if (file_exists(dirname(__FILE__) . '/rg2-override-config.php')) {
 	  require_once ( dirname(__FILE__) . '/rg2-override-config.php');
  }

  //
  // Handle the encondig for input data if
  // input encoding is not set to UTF-8
  //
  function encode_rg_input($input_str) {
    //
    $encoded = '';
    //
    if ( RG_INPUT_ENCODING != 'UTF-8' ) {
      //
      $encoded = @iconv( RG_INPUT_ENCODING, RG_OUTPUT_ENCODING, $input_str);
    } else {
      //
      $encoded = $input_str;
    }
    //
    if ( !$encoded ) {
      $encoded = "";
    }
    //
    return $encoded;
  }

  if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
    $url = OVERRIDE_KARTAT_DIRECTORY;
		
  } else {
    $url = RG_BASE_DIRECTORY."/kartat/";

  }
  
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

  $output = array();
  $i = 0;

  $row = 0;
	   
  switch ($type) {
		
    case 'events':
    
    if (($handle = fopen($url."kisat.txt", "r")) !== FALSE) {
      while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
        $detail = array();
				$detail["id"] = $data[0];
				$detail["mapid"] = $data[1];
				$detail["status"] = $data[2];
				// Issue #11: found a stray &#39; in a SUFFOC file
				$name = encode_rg_input($data[3]);
				$detail["name"] = str_replace("&#39;", "'", $name);
				$detail["date"] = $data[4];
				$detail["club"] = encode_rg_input($data[5]);
				$detail["type"] = $data[6];
				$detail["comment"] = encode_rg_input($data[7]);
				$output[$row] = $detail;				
        $row++;
      }
      fclose($handle);
		}
    break;	
		
	case 'courses':
    // extract control codes
    $controlsFound = false;
    $controls = array();
    $xpos = array();
		$ypos = array();
    // @ suppresses error report if file does not exist
    if (($handle = @fopen($url."sarjojenkoodit_".$id.".txt", "r")) !== FALSE) {
      $controlsFound = true;
      $row = 0;	
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
    if (($handle = fopen($url."ratapisteet_".$id.".txt", "r")) !== FALSE) {
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
    if (($handle = fopen($url."radat_".$id.".txt", "r")) !== FALSE) {
      while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
        $detail = array();
				$detail["courseid"] = $data[0];
				$detail["status"] = $data[1];
				$detail["name"] = encode_rg_input($data[2]);
				$detail["coords"] = $data[3];
				if ($controlsFound) {
					$detail["codes"] = $controls[$row];
				}
				$detail["xpos"] = $xpos[$row];
				$detail["ypos"] = $ypos[$row];
				$output[$row] = $detail;				
        $row++;
				
        //error_log("json row = ".$row.PHP_EOL, 3, "C:/temp/rg2.log");
      }
      fclose($handle);
		}
		

    
    break;

    
		
	case 'results':
	  $comments = 0;  
    $text = array();
    // @ suppresses error report if file does not exist
    if (($handle = @fopen($url."kommentit_".$id.".txt", "r")) !== FALSE) {
      while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
				// remove null comments
  			if (strncmp($data[4], "Type your comment", 17) != 0) {
				  $text[$comments]["resultid"] = $data[1];
				  // replace carriage return and line break codes
				  $temp = encode_rg_input($data[4]);
				  $temp = str_replace("#cr#", " ", $temp);			
				  $temp = str_replace("#nl#", " ", $temp); 					
				  $text[$comments]["comments"] = $temp; 
          $comments++;
				}
      }
      fclose($handle);
		}

    // @ suppresses error report if file does not exist
    if (($handle = @fopen($url."kilpailijat_".$id.".txt", "r")) !== FALSE) {
      while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
        $detail = array();
				$detail["resultid"] = $data[0];
				$detail["courseid"] = $data[1];
				$detail["coursename"] = encode_rg_input($data[2]);
				$detail["name"] = encode_rg_input($data[3]);
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
				    $detail["comments"] = encode_rg_input($text[$i]["comments"]);					
					}
				}	
				$output[$row] = $detail;				
        $row++;
      }
      fclose($handle);
		}
    break;
		
	case 'tracks':
	  $row = 0;  
    // @ suppresses error report if file does not exist
    if (($handle = @fopen($url."merkinnat_".$id.".txt", "r")) !== FALSE) {
      while (($data = fgetcsv($handle, 0, "|")) !== FALSE) {
        $detail = array();
				$detail["trackid"] = $data[0];
				$detail["resultid"] = $data[1];
				$detail["name"] = encode_rg_input($data[2]);
				$detail["null"] = $data[3];
				$detail["coords"] = $data[4];
				$output[$row] = $detail;				
        $row++;
				
        //error_log("json row = ".$row.PHP_EOL, 3, "C:/temp/rg2.log");
      }
      fclose($handle);
		}
    break;
    		
	default:
		break;
	}
	
  header("Content-type: application/json"); 
  echo "{\"data\":" .json_encode($output). "}";
?>
