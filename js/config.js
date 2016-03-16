/*global rg2:false */
/*global console:false */
/*global localStorage:false */
/*global rg2Config:false */
(function () {
  var config, options, dictionary;

  config = {
    DEFAULT_SCALE_FACTOR : 1.1,
    TAB_EVENTS : 0,
    TAB_COURSES : 1,
    TAB_RESULTS : 2,
    TAB_DRAW : 3,
    TAB_LOGIN : 4,
    TAB_CREATE : 5,
    TAB_EDIT : 6,
    TAB_MAP : 7,
    INVALID_MAP_ID: 9999,
    // translated when output so leave as English here
    DEFAULT_NEW_COMMENT : "Type your comment",
    DEFAULT_EVENT_COMMENT : "Comments (optional)",
    // added to resultid when saving a GPS track
    GPS_RESULT_OFFSET : 50000,
    MASS_START_REPLAY : 1,
    REAL_TIME_REPLAY : 2,
    // dropdown selection value
    MASS_START_BY_CONTROL : 99999,
    VERY_HIGH_TIME_IN_SECS : 99999,
    // screen sizes for different layouts
    BIG_SCREEN_BREAK_POINT : 800,
    SMALL_SCREEN_BREAK_POINT : 500,
    PURPLE : '#b300ff',
    RED : '#ff0000',
    GREEN : '#00ff00',
    RED_30 : 'rgba(255,0,0,0.3)',
    GREEN_30 : 'rgba(0,255,0,0.3)',
    WHITE : '#ffffff',
    BLACK : '#000000',
    RUNNER_DOT_RADIUS : 6,
    HANDLE_DOT_RADIUS : 7,
    HANDLE_COLOUR: '#ff0000',
    // parameters for call to draw courses
    DIM : 0.75,
    FULL_INTENSITY : 1.0,
    // values of event format
    NORMAL_EVENT : 1,
    EVENT_WITHOUT_RESULTS : 2,
    SCORE_EVENT : 3,
    // version gets set automatically by grunt file during build process
    RG2VERSION: '1.2.4',
    TIME_NOT_FOUND : 9999,
    // values for evt.which
    RIGHT_CLICK : 3,
    DO_NOT_SAVE_COURSE: 9999,
    FORMAT_NORMAL: 1,
    FORMAT_NO_RESULTS: 2,
    FORMAT_SCORE_EVENT: 3,
    DISPLAY_ALL_COURSES: 99999
  };

  options = {
    // initialised to default values: overwritten from storage later
    mapIntensity : 1,
    routeIntensity : 1,
    replayFontSize : 12,
    courseWidth : 3,
    routeWidth : 4,
    circleSize : 20,
    snap : true,
    showThreeSeconds : false,
    showGPSSpeed : false
  };

  // translation function
  function t(str) {
    if (dictionary.hasOwnProperty(str)) {
      return dictionary[str];
    }
    return str;
  }

  function translateTextFields() {
    var i, selector, text;
    selector = ["#rg2-events-tab a", "#rg2-courses-tab a", "#rg2-results-tab a", "#rg2-draw-tab a", '#rg2-draw-title', '#draw-text-1', '#draw-text-2', '#draw-text-3',
      '#draw-text-4', '#draw-text-5', '#rg2-load-gps-title', '.rg2-options-dialog .ui-dialog-title'];
    text = ['Events', 'Courses', 'Results', 'Draw', 'Draw route', 'Left click to add/lock/unlock a handle', 'Green - draggable', 'Red - locked', 'Right click to delete a handle',
      'Drag a handle to adjust track around locked point(s)', 'Load GPS file (GPX or TCX)', 'Configuration options'];
    for (i = 0; i < selector.length; i += 1) {
      $(selector[i]).text(t(text[i]));
    }
  }

  function translateTitleProperties() {
    var i, selector, text;
    selector = ["#rg2-hide-info-panel-icon", '#btn-about', '#btn-options', '#btn-zoom-out', '#btn-zoom-in', '#btn-reset', '#btn-show-splits', '#rg2-splits-table', '#btn-slower',
      '#btn-faster', '#btn-rotate-right', '#btn-rotate-left'];
    text = ["Hide info panel", 'Help', 'Options', 'Zoom out', 'Zoom in', 'Reset', 'Splits', 'Splits table', 'Slower', 'Faster', 'Rotate right', 'Rotate-left'];
    for (i = 0; i < selector.length; i += 1) {
      $(selector[i]).prop('title', t(text[i]));
    }
  }

  function translateTextContentProperties() {
    var i, selector, text;
    selector = ['label[for=rg2-control-select]', 'label[for=btn-full-tails]', 'label[for=spn-tail-length]', 'label[for=rg2-select-language]', 'label[for=spn-map-intensity]',
      'label[for=spn-route-intensity]', 'label[for=spn-route-width]', 'label[for=spn-name-font-size]', 'label[for=spn-course-width]', 'label[for=spn-control-circle]',
      'label[for=chk-snap-toggle]', 'label[for=chk-show-three-seconds]', 'label[for=chk-show-GPS-speed]', 'label[for=rg2-course-select]', 'label[for=rg2-name-select]', 'label[for=btn-move-all]'];
    text = ['Start at', 'Full tails', 'Length', 'Language', 'Map intensity %', 'Route intensity %', 'Route width', 'Replay label font size', 'Course overprint width', 'Control circle size',
      'Snap to control when drawing', 'Show +3 time loss for GPS routes', 'Show GPS speed colours', 'Select course', 'Select name', 'Move track and map together (or right click-drag)'];
    for (i = 0; i < selector.length; i += 1) {
      $(selector[i]).prop('textContent', t(text[i]));
    }
  }

  function translateButtons() {
    var i, selector, text;
    selector = ['#btn-undo', '#btn-undo-gps-adjust', '#btn-save-route', '#btn-reset-drawing', '#btn-three-seconds', '#btn-save-gps-route', '#btn-autofit-gps'];
    text = ['Undo', 'Undo', 'Save', 'Reset', '+3 sec', 'Save GPS route', 'Autofit'];
    for (i = 0; i < selector.length; i += 1) {
      $(selector[i]).button('option', 'label', t(text[i]));
    }
  }

  function translateFixedText() {
    var temp;
    translateTextFields();
    translateTitleProperties();
    translateTextContentProperties();
    translateButtons();
    temp = $('#btn-toggle-controls').prop('title');
    $('#btn-toggle-controls').prop('title', t(temp));
    temp = $('#btn-toggle-names').prop('title');
    $('#btn-toggle-names').prop('title', t(temp));
    temp = $('#btn-start-stop').prop('title');
    $('#btn-start-stop').prop('title', t(temp));
  }

  function createLanguageDropdown() {
    var i, selected, dropdown;
    $("#rg2-select-language").empty();
    dropdown = document.getElementById("rg2-select-language");
    selected = (dictionary.code === "en");
    dropdown.options.add(rg2.utils.generateOption('en', 'en: English', selected));
    for (i in rg2Config.languages) {
      if (rg2Config.languages.hasOwnProperty(i)) {
        selected = (dictionary.code === i);
        dropdown.options.add(rg2.utils.generateOption(i, i + ": " + rg2Config.languages[i], selected));
      }
    }
  }

  function getDictionaryCode() {
    return dictionary.code;
  }

  function setDictionary(newDictionary) {
    dictionary = newDictionary;
    translateFixedText();
  }

  function setLanguageOptions() {
    // use English unless a dictionary was passed in
    if (rg2Config.dictionary.code === undefined) {
      dictionary = {};
      dictionary.code = 'en';
    } else {
      dictionary = rg2Config.dictionary;
    }
    translateFixedText();
    createLanguageDropdown();
  }

  function setConfigOption(option, value) {
    this.options[option] = value;
  }

  function saveConfigOptions() {
    try {
      if ((window.hasOwnProperty('localStorage')) && (window.localStorage !== null)) {
        this.options.snap = $("#chk-snap-toggle").prop('checked');
        this.options.showThreeSeconds = $("#chk-show-three-seconds").prop('checked');
        this.options.showGPSSpeed = $("#chk-show-GPS-speed").prop('checked');
        localStorage.setItem('rg2-options', JSON.stringify(this.options));
      }
    } catch (e) {
      // storage not supported so just return
      return;
    }
  }

  function loadConfigOptions() {
    try {
      if ((window.hasOwnProperty('localStorage')) && (window.localStorage !== null)) {
        if (localStorage.getItem('rg2-options') !== null) {
          this.options = JSON.parse(localStorage.getItem('rg2-options'));
          // best to keep these at default?
          this.options.circleSize = 20;
          if (this.options.mapIntensity === 0) {
            rg2.utils.showWarningDialog("Warning", "Your saved settings have 0% map intensity so the map is invisible. You can adjust this on the configuration menu");
          }
        }
      }
    } catch (e) {
      // storage not supported so just continue
      console.log('Local storage not supported');
    }
  }

  function getOverprintDetails() {
    var opt, size, scaleFact, circleSize;
    opt = {};
    // attempt to scale overprint depending on map image size
    // this avoids very small/large circles, or at least makes things a bit more sensible
    size = rg2.getMapSize();
    // Empirically derived  so open to suggestions. This is based on a nominal 20px circle
    // as default. The square root stops things getting too big too quickly.
    // 1500px is a typical map image maximum size.
    scaleFact = Math.pow(Math.min(size.height, size.width) / 1500, 0.5);
    // don't get too carried away, although these would be strange map files
    scaleFact = Math.min(scaleFact, 5);
    scaleFact = Math.max(scaleFact, 0.5);
    circleSize = Math.round(rg2.options.circleSize * scaleFact);
    // ratios based on IOF ISOM overprint specification
    opt.controlRadius = circleSize;
    opt.finishInnerRadius = circleSize * (5 / 6);
    opt.finishOuterRadius = circleSize * (7 / 6);
    opt.startTriangleLength = circleSize * (7 / 6);
    opt.overprintWidth = this.options.courseWidth;
    opt.font = circleSize + 'pt Arial';
    return opt;
  }

  function getReplayDetails() {
    var opt;
    opt = {};
    opt.routeWidth = this.options.routeWidth;
    opt.routeIntensity = this.options.routeIntensity;
    opt.replayFontSize = this.options.replayFontSize;
    opt.showThreeSeconds = $("#chk-show-three-seconds").prop('checked');
    opt.showGPSSpeed = $("#chk-show-GPS-speed").prop('checked');
    return opt;
  }
  rg2.t = t;
  rg2.options = options;
  rg2.config = config;
  rg2.saveConfigOptions = saveConfigOptions;
  rg2.setConfigOption = setConfigOption;
  rg2.loadConfigOptions = loadConfigOptions;
  rg2.getReplayDetails = getReplayDetails;
  rg2.getOverprintDetails = getOverprintDetails;
  rg2.setDictionary = setDictionary;
  rg2.getDictionaryCode = getDictionaryCode;
  rg2.setLanguageOptions = setLanguageOptions;
}());
