/* eslint-env node */
module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    uglify: {
      options: {
        banner: '// Version <%= pkg.version %> <%= grunt.template.today("isoDateTime") %>;\n',
        sourceMap: true,
      },
      build: {
        src: jsFileList,
        dest: jsMinFile,
      },
      manager: {
        src: jsManagerSrc,
        dest: jsManagerMinFile,
      },
    },

    postcss: {
      options: {
        failOnError: true,
        map: false,
        processors: [
          require('autoprefixer'),
          require('cssnano')({preset: "default"})
        ]
      },
      dist: {
        src: "css/rg2.css",
        dest: "css/rg2-<%= pkg.version %>.min.css"
      }
    },

    sync: {
      rel: {
        files: [
          {
            src: ["rg2api.php", "index.php", "app/**", "html/**", "img/favicon.ico", "img/manifest.json"],
            dest: "rel/",
          },
        ],
        verbose: true,
        pretend: false, // Don't do any disk operations - just write log. Default: false
        failOnError: true, // Fail the task when copying is not possible. Default: false
        updateAndDelete: true,
      },
    },

    bumpup: "package.json",

    replace: {
      jsversion: {
        src: "js/config.js",
        overwrite: true,
        replacements: [
          {
            from: /RG2VERSION.*'/,
            to: "RG2VERSION: '<%= pkg.version %>'",
          },
        ],
      },
      phpversion: {
        src: ["rg2api.php", "index.php"],
        overwrite: true,
        replacements: [
          {
            from: /\('RG2VERSION'.*\)/,
            to: "('RG2VERSION', '<%= pkg.version %>')",
          },
        ],
      },
    },

    clean: {
      minified: ["js/*.min.js", "js/*.js.map", "css/*.min.css"],
    },
  });

  // Load all the grunt tasks
  require("load-grunt-tasks")(grunt);

  for (var i = 0; i < clubs.length; i++) {
    var club = clubs[i];
    grunt.config(["sync", club], {
      files: [
        {
          cwd: "rel/",
          expand: true,
          src: "**",
          dest: "website/" + club + ".routegadget.co.uk/public_html/rg2/",
        },
      ],
      verbose: true, // Default: false
      pretend: false, // Don't do any disk operations - just write log. Default: false
      failOnError: true, // Fail the task when copying is not possible. Default: false
      ignoreInDest: "rg2-config.php",
      updateAndDelete: true,
    });
  }

  // clok has a different directory set-up
  grunt.config(["sync", "clok"], {
    files: [
      {
        cwd: "rel/",
        expand: true,
        src: "**",
        dest: "website/clok.routegadget.co.uk/public_html/gadget/rg2/",
      },
    ],
    verbose: true, // Default: false
    pretend: false, // Don't do any disk operations - just write log. Default: false
    failOnError: true, // Fail the task when copying is not possible. Default: false
    ignoreInDest: "rg2-config.php",
    updateAndDelete: true,
  });

  grunt.registerTask("default", ["build"]);

  // increment minor version number: do anything else by editting package.json by hand
  grunt.registerTask("bump", ["bumpup"]);

  grunt.registerTask("build", ["clean:minified", "postcss", "uglify", "build-manager"]);

  grunt.registerTask("build-manager", ["uglify:manager"]);

  grunt.registerTask("deploy", ["replace:jsversion", "replace:phpversion", "build", "sync:rel"]);
};

var jsFileList = [
  "js/rg2.js",
  "js/animation.js",
  "js/canvas.js",
  "js/config.js",
  "js/control.js",
  "js/controls.js",
  "js/course.js",
  "js/courses.js",
  "js/draw.js",
  "js/event.js",
  "js/events.js",
  "js/gpstrack.js",
  "js/handles.js",
  "js/map.js",
  "js/plugins.js",
  "js/result.js",
  "js/results.js",
  "js/rg2getjson.js",
  "js/rg2input.js",
  "js/rg2ui.js",
  "js/runner.js",
  "js/stats.js",
  "js/utils.js",
  "js/lib/he.js",
];

var jsManagerSrc = [
  "js/manager.js",
  "js/courseparser.js",
  "js/resultparseriofv2.js",
  "js/resultparseriofv3.js",
  "js/resultparsercsv.js",
  "js/resultparser.js",
  "js/managerui.js",
];

var jsMinFile = "js/rg2-<%= pkg.version %>.min.js";
var jsManagerMinFile = "js/rg2manager-<%= pkg.version %>.min.js";

// installed routegadget.co.uk clubs that need to be updated for a new release
// careful: clok has a different config so is set up separately
var clubs = [
  "aire",
  "albania",
  "ayroc",
  "bado",
  "baoc",
  "basoc",
  "bko",
  "boc",
  "bok",
  "bl",
  "chig",
  "claro",
  "clyde",
  "coboc",
  "cuoc",
  "cvfr",
  "darkandwhite",
  "dee",
  "devonoc",
  "ebor",
  "ecko",
  "elo",
  "epoc",
  "eryri",
  "esoc",
  "euoc",
  "gmoa",
  "gramp",
  "go",
  "halo",
  "happyherts",
  "havoc",
  "hoc",
  "interlopers",
  "invoc",
  "jk",
  "kerno",
  "kfo",
  "kongmmm",
  "lamm",
  "leioc",
  "loc",
  "log",
  "lok",
  "lvo",
  "maroc",
  "masterplanadventure",
  "mdoc",
  "mid-wales",
  "moravian",
  "mvoc",
  "nato",
  "ngoc",
  "noroc",
  "nwo",
  "od",
  "omm",
  "orox",
  "ouoc",
  "oureaevents",
  "pfo",
  "potoc",
  "quantock",
  "rafo",
  "roxburghreivers",
  "run-herts",
  "sa",
  "sarum",
  "saxons",
  "sboc",
  "scottish6days",
  "seloc",
  "sl_2020",
  "slow",
  "slmm",
  "smbo",
  "smoc",
  "sn",
  "so",
  "soa",
  "soc",
  "solway",
  "sos",
  "sportident",
  "sroc",
  "stag",
  "start",
  "suffoc",
  "swoc",
  "syo",
  "tay",
  "test",
  "purple-thistle",
  "tinto",
  "tvoc",
  "walton",
  "waoc",
  "wcoc",
  "wim",
  "wmoc",
  "wrekin",
  "wsco2008",
  "wsx",
];
