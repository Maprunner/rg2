<?php
class route
{
    public static function getRoutesForEvent($eventid)
    {
        $output = array();
        // read drawn routes from merkinnat file
        if (($handle = @fopen(KARTAT_DIRECTORY."merkinnat_".$eventid.".txt", "r")) !== false) {
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
                $courseid = intval($data[0]);
                $resultid = intval($data[1]);
                // protect against corrupt/invalid files
                // GPS routes are taken from another file so don't add them here
                if (($resultid > 0) && ($resultid < GPS_RESULT_OFFSET) && ($courseid > 0)) {
                    $detail = array();
                    $detail["id"] = $resultid;
                    list($detail["x"], $detail["y"]) = self::expandCoords($data[4]);
                    $output[] = $detail;
                }
            }
            fclose($handle);
        }
        // send GPS routes from kilpailijat file, where they are correctly stored at 3 second intervals
        if (($handle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", "r")) !== false) {
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
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
                        list($detail["x"], $detail["y"]) = self::expandCoords($data[9]);
                        $output[] = $detail;
                    }
                }
            }
            fclose($handle);
        }
        return $output;
    }

    public static function addNewRoute($eventid, $data)
    {
        //utils::rg2log("Add new route for eventid ".$eventid);
        $newresult = false;
        $id = $data->resultid;
        $lastid = 0;
        if (($data->resultid == 0) || ($data->resultid == GPS_RESULT_OFFSET)) {
            // result needs to be allocated a new id: happens when event has no initial results
            $newresult = true;
            // allow for this being the first entry for an event with no results
            // can't use row counts to generate ids any more since results can be deleted
            if (($handle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", "r+")) !== false) {
                // read to end of file to find last id in use
                while (($olddata = fgetcsv($handle, 0, "|")) !== false) {
                    if (count($olddata) > 0) {
                        $lastid = intval($olddata[0]);
                    }
                }
                // take off any existing GPS offset
                // messy and probably unnecessary since you should only get one route per result for this format
                // but safest for now
                while ($lastid > GPS_RESULT_OFFSET) {
                    $lastid = $lastid - GPS_RESULT_OFFSET;
                }
                $id = $lastid + 1;
            } else {
                // first result for event with no initial results
                $id = 1;
            }
            if ($data->resultid == GPS_RESULT_OFFSET) {
                $id = GPS_RESULT_OFFSET + $id;
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
        $name = utils::encode_rg_output($name);
        // tidy up comments
        $comments = utils::tidyNewComments($data->comments);
        $newcommentdata = $data->courseid."|".$id."|".$name."||".$comments.PHP_EOL;

        // co-ords sent as differences, so recreate absolute values
        for ($i = 1; $i < count($data->x); $i++) {
            $data->x[$i] = $data->x[$i - 1] + $data->x[$i];
            $data->y[$i] = $data->y[$i - 1] + $data->y[$i];
        }
        for ($i = 1; $i < count($data->time); $i++) {
            $data->time[$i] = $data->time[$i - 1] + $data->time[$i];
        }

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
        // calculate a hash to allow deletion
        $token = md5(serialize($newtrackdata));

        $newresultdata = "";
        if (($newresult === true) || ($id >= GPS_RESULT_OFFSET)) {
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

            $newresultdata = $id."|".$data->courseid."|".utils::encode_rg_output($data->coursename)."|".$name;
            if ($id >= GPS_RESULT_OFFSET) {
                $newresultdata .= "|".$data->startsecs."|||".$data->totaltime."||".$track.PHP_EOL;
            } else {
                $newresultdata .= "|".$data->startsecs."|||".$data->totaltime."|".$data->totalsecs.";|".PHP_EOL;
            }
        }

        $write["status_msg"] = "";

        if (($handle = @fopen(KARTAT_DIRECTORY."kommentit_".$eventid.".txt", "a")) !== false) {
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

        if (($newresult === true) || ($id >= GPS_RESULT_OFFSET)) {
            if (($handle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", "a")) !== false) {
                $status =fwrite($handle, $newresultdata);
                if (!$status) {
                    $write["status_msg"] .= " Save error for kilpailijat.";
                }
                @fflush($handle);
                @fclose($handle);
            }
        }

        if ($write["status_msg"] == "") {
            $write["ok"] = true;
            $write["status_msg"] = "Record saved";
            $write["token"] = $token;
            $write["eventid"] = $eventid;
        //utils::rg2log("Route saved|".$eventid."|".$id);
        } else {
            $write["ok"] = false;
        }

        return $write;
    }

    public static function deleteRoute($eventid)
    {
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
            utils::rg2log("Route to be deleted|".$routeid);
            // delete comments
            $filename = KARTAT_DIRECTORY."kommentit_".$eventid.".txt";
            $oldfile = file($filename);
            $updatedfile = array();
            $deleted = false;
            foreach ($oldfile as $row) {
                $data = explode("|", $row);
                if ($data[1] == $routeid) {
                    $deleted = true;
                } else {
                    $updatedfile[] = $row;
                }
            }
            $status = file_put_contents($filename, $updatedfile);

            if ($status === false) {
                $write["status_msg"] .= "Save error for kommentit. ";
            }
            if (!$deleted) {
                $write["status_msg"] .= "Route not found in comments file. ";
            }

            // delete result if this event started with no results (format 2)
            // delete GPS details since these are always added as a new result
            if (($routeid >= GPS_RESULT_OFFSET) || ($format == 2)) {
                $filename = KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt";
                $oldfile = file($filename);
                $updatedfile = array();
                $deleted = false;
                foreach ($oldfile as $row) {
                    $data = explode("|", $row);
                    if ($data[0] == $routeid) {
                        $deleted = true;
                    } else {
                        $updatedfile[] = $row;
                    }
                }
                $status = file_put_contents($filename, $updatedfile);

                if ($status === false) {
                    $write["status_msg"] .= "Save error for kilpailijat. ";
                }
                if (!$deleted) {
                    $write["status_msg"] .= "Route not found in results file. ";
                }
            }

            // delete route
            $filename = KARTAT_DIRECTORY."merkinnat_".$eventid.".txt";
            $oldfile = file($filename);
            $updatedfile = array();
            $deleted = false;
            foreach ($oldfile as $row) {
                $data = explode("|", $row);
                if ($data[1] == $routeid) {
                    $deleted = true;
                } else {
                    $updatedfile[] = $row;
                }
            }
            $status = file_put_contents($filename, $updatedfile);

            if ($status === false) {
                $write["status_msg"] .= " Save error for merkinnat. ";
            }
            if (!$deleted) {
                $write["status_msg"] .= "Route not found in routes file. ";
            }
        } else {
            $write["status_msg"] = "Invalid route id. ";
        }

        if ($write["status_msg"] == "") {
            $write["ok"] = true;
            $write["eventid"] = $eventid;
            $write["routeid"] = $routeid;
            $write["status_msg"] = "Route deleted";
            utils::rg2log("Route deleted|".$eventid."|".$routeid);
        } else {
            $write["ok"] = false;
        }

        return($write);
    }

    public static function canDeleteMyRoute($eventid, $data)
    {
        $validrequest = false;
        if (isset($_GET['routeid'])) {
            $routeid = $_GET['routeid'];
            $token = $data->token;
            $filename = KARTAT_DIRECTORY."merkinnat_".$eventid.".txt";
            $oldfile = file($filename);
            foreach ($oldfile as $row) {
                $data = explode("|", $row);
                if ($data[1] == $routeid) {
                    $hash = md5(serialize($row));
                    if ($hash == $token) {
                        $validrequest = true;
                    }
                }
            }
        }
        return $validrequest;
    }

    private static function expandCoords($coords)
    {
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
                if ($pos !== false) {
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
}
