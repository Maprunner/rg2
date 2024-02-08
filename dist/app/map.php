<?php
class map
{
  public static function getMaps()
  {
    $output = array();
    $row = 0;
    if (($handle = @fopen(KARTAT_DIRECTORY . "kartat.txt", "r")) !== false) {
      while (($data = fgetcsv($handle, 0, "|")) !== false) {
        $detail = array();
        if (count($data) > 1) {
          $detail["mapid"] = intval($data[0]);
          $detail["name"] = utils::encode_rg_input($data[1]);
          // defaults to jpg so only need to say if we have something else as well
          if (file_exists(KARTAT_DIRECTORY . $detail['mapid'] . '.gif')) {
            $detail["mapfilename"] = $detail['mapid'] . '.gif';
          }
          $detail["georeferenced"] = false;
          if (count($data) == 14) {
            list($A, $B, $C, $D, $E, $F) = self::generateWorldFile($data);
            $detail["A"] = $A;
            $detail["B"] = $B;
            $detail["C"] = $C;
            $detail["D"] = $D;
            $detail["E"] = $E;
            $detail["F"] = $F;
            list($localA, $localB, $localC, $localD, $localE, $localF) = self::generateLocalWorldFile($data);
            $detail["localA"] = $localA;
            $detail["localB"] = $localB;
            $detail["localC"] = $localC;
            $detail["localD"] = $localD;
            $detail["localE"] = $localE;
            $detail["localF"] = $localF;
            // make sure it worked OK
            if (($E != 0) && ($F != 0)) {
              $detail["georeferenced"] = true;
            }
          }
          $output[$row] = $detail;
          $row++;
        }
      }
      fclose($handle);
    }
    return utils::addVersion('maps', $output);
  }

  public static function uploadMapFile()
  {
    $write = array();
    $write["ok"] = false;
    $write["status_msg"] = "Map upload failed.";
    $data = new stdClass();
    $data->x = $_POST["x"];
    $data->y = $_POST["y"];
    if (!user::logIn($data)) {
      $write["status_msg"] = "Login failed.";
    } else {
      $filename = $_POST["name"];
      // PHP changes . and space to _ just for fun
      $filename = str_replace(".", "_", $filename);
      $filename = str_replace(" ", "_", $filename);
      if (is_uploaded_file($_FILES[$filename]['tmp_name'])) {
        $file = $_FILES[$filename];
        if ($file['type'] == 'image/jpeg') {
          if (move_uploaded_file($file['tmp_name'], KARTAT_DIRECTORY . 'temp.jpg')) {
            $write["ok"] = true;
            $write["status_msg"] = "Map uploaded.";
          }
        }
        if ($file['type'] == 'image/gif') {
          $jpgOK = true;
          if (CREATE_JPG_MAP_FILES) {
            if ($image = imagecreatefromgif($file['tmp_name'])) {
              $jpgOK = imagejpeg($image, KARTAT_DIRECTORY . 'temp.jpg');
            }
          }
          $gifMoved = (move_uploaded_file($file['tmp_name'], KARTAT_DIRECTORY . 'temp.gif'));

          if ($gifMoved && $jpgOK) {
            $write['ok'] = true;
            $write['status_msg'] = "Map uploaded.";
          }
        }
      }
    }

    $keksi = user::generateNewKeksi();
    $write["keksi"] = $keksi;

    header("Content-type: application/json");
    echo json_encode($write);
  }

  public static function addNewMap($data)
  {
    $write["status_msg"] = "";
    if (($handle = @fopen(KARTAT_DIRECTORY . "kartat.txt", "r+")) !== false) {
      // read to end of file to find last entry
      $oldid = 0;
      while (($olddata = fgetcsv($handle, 0, "|")) !== false) {
        // blank rows come back as a single null array entry so ignore them
        if (count($olddata) > 1) {
          // ids should be increasing anyway, but just in case...
          if (intval($olddata[0]) > $oldid) {
            $oldid = intval($olddata[0]);
          }
        }
      }
      $newid = $oldid + 1;
    } else {
      // create empty kartat file
      $newid = 1;
      $handle = @fopen(KARTAT_DIRECTORY . "kartat.txt", "w+");
    }
    $renamingOK = true;
    // may not have uploaded a GIF
    if (file_exists(KARTAT_DIRECTORY . "temp.gif")) {
      $renamingOK = rename(KARTAT_DIRECTORY . "temp.gif", KARTAT_DIRECTORY . $newid . ".gif");
    }

    // may not have a JPG if we have a GIF and we do no need to maintain backward compatibility with Original Routegadget
    if ($renamingOK && file_exists(KARTAT_DIRECTORY . "temp.jpg")) {
      $renamingOK = rename(KARTAT_DIRECTORY . "temp.jpg", KARTAT_DIRECTORY . $newid . ".jpg");
    }

    if (($renamingOK)) {
      $newmap = $newid . "|" . utils::encode_rg_output($data->name);
      if ($data->worldfile->valid) {
        $newmap .= "|" . $data->xpx[0] . "|" . $data->lon[0] . "|" . $data->ypx[0] . "|" . $data->lat[0];
        $newmap .= "|" . $data->xpx[1] . "|" . $data->lon[1] . "|" . $data->ypx[1] . "|" . $data->lat[1];
        $newmap .= "|" . $data->xpx[2] . "|" . $data->lon[2] . "|" . $data->ypx[2] . "|" . $data->lat[2];
      }
      if ($data->localworldfile->valid) {
        // save local worldfile for use in aligning georeferenced courses
        $wf = $data->localworldfile->A . "," . $data->localworldfile->B . "," . $data->localworldfile->C . "," . $data->localworldfile->D . "," . $data->localworldfile->E . "," . $data->localworldfile->F . PHP_EOL;
        @file_put_contents(KARTAT_DIRECTORY . "worldfile_" . $newid . ".txt", $wf);
      }

      $newmap .= PHP_EOL;
      $write["newid"] = $newid;
      $status = fwrite($handle, $newmap);
      if (!$status) {
        $write["status_msg"] = "Save error for kartat. ";
      }
    } else {
      $write["status_msg"] = "Error renaming map file. ";
    }
    @fflush($handle);
    @fclose($handle);

    if ($write["status_msg"] == "") {
      $write["ok"] = true;
      $write["name"] = utils::encode_rg_output($data->name);
      $write["status_msg"] = "Map added";
      utils::rg2log("Map added|" . $newid);
    } else {
      $write["ok"] = false;
    }

    return $write;
  }

  private static function generateLocalWorldFile($data)
  {
    // looks for local worldfile
    $file = KARTAT_DIRECTORY . "worldfile_" . intval($data[0]) . ".txt";
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

  public static function generateWorldFile($data)
  {
    // takes three georeferenced points in a kartat row and converts to World File format
    for ($i = 0; $i < 3; $i++) {
      $x[$i] = intval($data[2 + ($i * 4)]);
      $lon[$i] = floatval($data[3 + ($i * 4)]);
      $y[$i] = intval($data[4 + ($i * 4)]);
      $lat[$i] = floatval($data[5 + ($i * 4)]);
      //utils::rg2log($data[0].", ".$lat[$i].", ".$lon[$i].", ".$x[$i].", ".$y[$i]);
    }
    // assumes various things about the three points
    // works for RG2, may not work for the original, but we can live with that
    // ideally we would have saved the world file rather than three points
    if (($x[0] !== 0) || ($y[0] !== 0) || ($y[2] !== 0) || ($x[2] === 0)) {
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

  public static function deleteUnusedMaps($data)
  {
    $write["status_msg"] = "";
    $usedmapids = array();
    $requestedids = $data->maps;

    // extract list of used map ids
    if (($handle = @fopen(KARTAT_DIRECTORY . "kisat.txt", "r+")) !== false) {
      while (($eventdata = fgetcsv($handle, 0, "|")) !== false) {
        if (count($eventdata) > 2) {
          $usedmapids[] = $eventdata[1];
        }
      }
    }
    @fclose($handle);

    $dodelete = array();
    // only delete requested list if they are really unused
    for ($i = 0; $i < count($requestedids); $i++) {
      if (!in_array($requestedids[$i], $usedmapids)) {
        $dodelete[] = $requestedids[$i];
      }
    }

    // delete maps from kartat file
    $filename = KARTAT_DIRECTORY . "kartat.txt";
    $oldfile = file($filename);
    $updatedfile = array();
    $deleted = "";
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if (count($data) > 0) {
        if (!in_array($data[0], $dodelete)) {
          $updatedfile[] = $row;
        } else {
          $deleted .= "|" . $data[0];
        }
      }
    }
    $status = file_put_contents($filename, $updatedfile);
    if ($status === false) {
      $write["status_msg"] .= "Save error for kartat. ";
    }

    // delete associated map files
    for ($i = 0; $i < count($dodelete); $i++) {
      @unlink(KARTAT_DIRECTORY . $dodelete[$i] . ".jpg");
      @unlink(KARTAT_DIRECTORY . $dodelete[$i] . ".gif");
      @unlink(KARTAT_DIRECTORY . "worldfile_" . $dodelete[$i] . ".txt");
    }

    if ($write["status_msg"] == "") {
      $write["ok"] = true;
      $write["status_msg"] = "Unused maps deleted";
      utils::rg2log("Unused maps deleted" . $deleted);
    } else {
      $write["ok"] = false;
    }

    return $write;
  }

  private static function isGIF($name)
  {
    return (substr($name, -3) === "gif");
  }

  public static function removeRedundantJPG()
  {
    // only way to call this is as a direct API call
    // only allow deletion if we have set the config option to say we don't want them
    if (!CREATE_JPG_MAP_FILES) {
      $write["status_msg"] = "";
      // extract list of GIF files
      $files = scandir(KARTAT_DIRECTORY);
      $gifs = array_filter($files, "self::isGIF");
      $deleted = "";
      foreach ($gifs as $filename) {
        // replace gif with jpg in file name
        $name = substr($filename, 0, -3) . "jpg";
        if (file_exists(KARTAT_DIRECTORY . $name)) {
          @unlink(KARTAT_DIRECTORY .  $name);
          $deleted .= $name . " ";
        }
      }
      $write["ok"] = true;
      $write["status_msg"] = "Redundant jpgs deleted: " . $deleted;
      utils::rg2log("JPG files deleted: " . $deleted);
    } else {
      $write["ok"] = true;
      $write["status_msg"] = "Redundant jpgs cannot be deleted";
      utils::rg2log("JPG files not deleted");
    }
    return $write;
  }
}
