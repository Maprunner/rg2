This /lock directory is used by rg2api.php to implement file locking so that multiple users can update
the data files at the same time. When things are working correctly this directory will normally be empty.
It will contain one or more temporary directories for a very short time (possibly up to around 5 seconds) when
information is being saved.

If a serious error occurs then a directory may not be deleted correctly, which will prevent RG2 from working.
Any subdirectories in /lock can be deleted if necessary to restore correct operation.


