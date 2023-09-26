<?php
class user
{
  public static function logIn($data)
  {
    if (isset($data->x) && isset($data->y)) {
      $userdetails = self::extractString($data->x);
      $cookie = $data->y;
    } else {
      $userdetails = "anon";
      $cookie = "none";
    }
    $ok = true;
    $keksi = trim(file_get_contents(KARTAT_DIRECTORY . "keksi.txt"));
    if (file_exists(KARTAT_DIRECTORY . "rg2userinfo.txt")) {
      $saved_user = trim(file_get_contents(KARTAT_DIRECTORY . "rg2userinfo.txt"));
      if (!password_verify($userdetails, $saved_user)) {
        utils::rg2log("User details incorrect.");
        $ok = false;
      }
      if ($keksi != $cookie) {
        utils::rg2log("Cookies don't match. " . $keksi . " : " . $cookie);
        $ok = false;
      }
    } else {
      // new account being set up: rely on JS end to force a reasonable name/password
      $temp = password_hash($userdetails, PASSWORD_DEFAULT);
      utils::rg2log("Creating new account.");
      file_put_contents(KARTAT_DIRECTORY . "rg2userinfo.txt", $temp . PHP_EOL);
    }
    return $ok;
  }

  // Mickey Mouse function to extract user name and password
  // just avoids plain text transmission for now so a bit better than RG1
  private static function extractString($data)
  {
    $str = "";
    for ($i = 0; $i < strlen($data); $i = $i + 2) {
      $str .= substr($data, $i, 1);
    }
    return $str;
  }

  public static function generateNewKeksi()
  {
    // simple cookie generator! Don't need unique, just need something vaguely random
    $keksi = substr(str_shuffle("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"), 0, 20);
    $result = file_put_contents(KARTAT_DIRECTORY . "keksi.txt", $keksi . PHP_EOL);
    //utils::rg2log(KARTAT_DIRECTORY." ".$keksi." ".$result);
    if ($result === false) {
      utils::rg2log("Error writing keksi.txt: " . $keksi);
    }
    return $keksi;
  }
}
