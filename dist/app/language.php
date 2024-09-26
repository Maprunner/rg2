<?php
class language
{
  public static function getLanguage($lang)
  {
    $output = [];
    $file = LANG_DIRECTORY . $lang . ".txt";
    if (($handle = @fopen($file, "r")) !== false) {
      while (($data = fgetcsv($handle, 0, ",")) !== false) {
        if (count($data) > 1) {
          $output[$data[0]] = $data[1];
        }
      }
      fclose($handle);
    }
    return utils::addVersion('lang', $output);
  }
}
