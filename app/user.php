<?php
class user
{
  public static function logIn($data)
  {
    $ok = true;
    if (isset($data->x)) {
      $userdetails = self::extractString($data->x);
    } else {
      $userdetails = "anon";
    }
    $session_logged_in = isset($_SESSION['loggedin']) ? $_SESSION['loggedin'] : false;
    $session_userdetails = isset($_SESSION['userdetails']) ? $_SESSION['userdetails'] : "";
    utils::rg2log("Session: ", $session_logged_in ? "logged in" : "not logged in");
    utils::rg2log("Session user details: " . $session_userdetails);
    // if this user is already logged in then we don't need to do anything
    if ($session_logged_in && ($session_userdetails === $userdetails)) {
      return $ok;
    }

    // not logged in so we need to check the user details
    if (file_exists(KARTAT_DIRECTORY . "rg2userinfo.txt")) {
      $saved_user = trim(file_get_contents(KARTAT_DIRECTORY . "rg2userinfo.txt"));
      if (!password_verify($userdetails, $saved_user)) {
        utils::rg2log("User details incorrect.");
        $ok = false;
      }
    } else {
      // new account being set up: rely on JS end to force a reasonable name/password
      $temp = password_hash($userdetails, PASSWORD_DEFAULT);
      utils::rg2log("Creating new account.");
      file_put_contents(KARTAT_DIRECTORY . "rg2userinfo.txt", $temp . PHP_EOL);
    }
    $_SESSION['userdetails'] = $userdetails;
    $_SESSION['loggedin'] = $ok;
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
}
