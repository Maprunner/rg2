<?php
class map
{
    public static function getMaps()
    {
        $output = array();
        $row = 0;
        if (($handle = @fopen(KARTAT_DIRECTORY."kartat.txt", "r")) !== false) {
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
                $detail = array();
                if (count($data) > 1) {
                    $detail["mapid"] = intval($data[0]);
                    $detail["name"] = utils::encode_rg_input($data[1]);
                    // defaults to jpg so only need to say if we have something else as well
                    if (file_exists(KARTAT_DIRECTORY.$detail['mapid'].'.gif')) {
                        $detail["mapfilename"] = $detail['mapid'].'.gif';
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
                    if (move_uploaded_file($file['tmp_name'], KARTAT_DIRECTORY.'temp.jpg')) {
                        $write["ok"] = true;
                        $write["status_msg"] = "Map uploaded.";
                    }
                }
                if ($file['type'] == 'image/gif') {
                    if ($image = imagecreatefromgif($file['tmp_name'])) {
                        if (imagejpeg($image, KARTAT_DIRECTORY.'temp.jpg')) {
                            if (move_uploaded_file($file['tmp_name'], KARTAT_DIRECTORY.'temp.gif')) {
                                $write['ok'] = true;
                                $write['status_msg'] = "Map uploaded.";
                            }
                        }
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
        if (($handle = @fopen(KARTAT_DIRECTORY."kartat.txt", "r+")) !== false) {
            // read to end of file to find last entry
            $oldid = 0;
            while (($olddata = fgetcsv($handle, 0, "|")) !== false) {
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
            $renameGIF = true;
        }
        // always need a JPG for original Routegadget to maintain backward compatibility
        $renameJPG = rename(KARTAT_DIRECTORY."temp.jpg", KARTAT_DIRECTORY.$newid.".jpg");

        if (($renameJPG && $renameGIF)) {
            $newmap = $newid."|".utils::encode_rg_output($data->name);
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
            $write["ok"] = true;
            $write["status_msg"] = "Map added";
            utils::rg2log("Map added|".$newid);
        } else {
            $write["ok"] = false;
        }

        return $write;
    }

    private static function generateLocalWorldFile($data)
    {
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
}
