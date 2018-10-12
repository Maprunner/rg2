module.exports = function(grunt) {
  var jsFileList = ['js/rg2.js', 'js/animation.js', 'js/canvas.js', 'js/config.js', 'js/control.js', 'js/controls.js', 'js/course.js', 'js/courses.js',
    'js/draw.js', 'js/event.js', 'js/events.js', 'js/gpstrack.js', 'js/handles.js', 'js/map.js', 'js/plugins.js', 'js/result.js',
    'js/results.js', 'js/rg2getjson.js', 'js/rg2input.js', 'js/rg2ui.js', 'js/runner.js', 'js/utils.js', 'js/lib/he.js'
    ];

  var langFileList = ['lang/de.js', 'lang/fi.js', 'lang/fr.js', 'lang/it.js', 'lang/ja.js', 'lang/no.js', 'lang/pt.js', 'lang/xx.js'];

  // don't jsHint he.js, plugins.js
  var jsHintList = ['js/rg2.js', 'js/animation.js', 'js/canvas.js', 'js/config.js', 'js/control.js', 'js/controls.js', 'js/course.js',
    'js/courses.js', 'js/draw.js', 'js/event.js', 'js/events.js', 'js/gpstrack.js', 'js/handles.js', 'js/map.js', 'js/result.js',
    'js/results.js', 'js/rg2getjson.js', 'js/rg2input.js', 'js/rg2ui.js', 'js/runner.js', 'js/utils.js'];

  var jsManagerSrc = ['js/manager.js', 'js/courseparser.js', 'js/resultparseriofv2.js', 'js/resultparseriofv3.js', 'js/resultparsercsv.js', 'js/resultparser.js', 'js/managerui.js'];

  var jsMinFile = 'js/rg2-<%= pkg.version %>.min.js';
  var jsManagerMinFile = 'js/rg2manager-<%= pkg.version %>.min.js';

  var relDir = 'ftpsite/';

  var ftpHost = 'ftp.routegadget.co.uk';

  // installed routegadget.co.uk clubs that need to be updated for a new release
  // careful: clok has a different config so is set up separately
  var clubs = ['aire', 'albania', 'ayroc', 'bado', 'baoc', 'basoc', 'bko', 'boc', 'bok', 'bl', 'chig', 'claro', 'clyde', 'coboc', 'cuoc', 'cvfr', 'darkandwhite', 'dee',
   'devonoc', 'ebor', 'ecko', 'elo', 'epoc', 'eryri', 'esoc', 'euoc', 'gmoa', 'gramp', 'go', 'halo', 'happyherts', 'havoc', 'hoc', 'interlopers', 'invoc', 'jk', 'kerno', 'kfo',
   'lamm', 'leioc', 'loc', 'log', 'lok', 'lvo', 'maroc', 'masterplanadventure', 'mdoc', 'mid-wales', 'moravian', 'mvoc', 'nato', 'ngoc', 'noroc', 'nwo', 'od', 'omm', 'ouoc',
   'pfo', 'potoc', 'quantock', 'rafo', 'roxburghreivers', 'sa', 'sarum', 'saxons', 'sboc', 'scottish6days', 'seloc', 'slow', 'slmm', 'smbo', 'smoc', 'sn', 'so', 'soa', 'soc',
   'solway', 'sportident', 'sroc', 'stag', 'start', 'suffoc', 'swoc', 'syo', 'tay', 'test', 'purple-thistle', 'tinto', 'tvoc', 'walton', 'waoc', 'wcoc', 'wim', 'wmoc',
   'wrekin', 'wsco2008', 'wsx'];

  // Project configuration.
  grunt.initConfig({
    pkg : grunt.file.readJSON('package.json'),

    jshint : {
      options : {
        curly : true,
        plusplus : true,
        esversion : 3,
        //strict: true,
        undef : true,
        unused: true,
        trailing : true,
        globals : {
          $ : false,
          window : false,
          document : false,
          alert : false,
          FileReader : false,
          console : false,
          JSON: true
        }
      },
      manager : {
        src: jsManagerSrc
      },
      all : {
        src : jsHintList
      },
      lang : {
        src : langFileList
      }
    },

    csslint: {
      options: {
      	// 2 means treat as an error
        'import': 2,
        // false means ignore rule
        // TODO: rewrite CSS to allow these to be removed, but for now it works
        'ids': false,
        'box-model': false,
        'duplicate-background-images': false,
        'outline-none': false
      },
      src: 'css/rg2.css'
    },

    uglify : {
      options : {
        banner : '// Version <%= pkg.version %> <%= grunt.template.today("isoDateTime") %>;\n',
        sourceMap: true
      },
      build : {
        src : jsFileList,
        dest : jsMinFile
      },
      manager : {
        src : jsManagerSrc,
        dest : jsManagerMinFile
      }
    },

    cssmin: {
      options: {
        shorthandCompacting: false,
        roundingPrecision: -1
     },
     target: {
       files: {
        'css/rg2-<%= pkg.version %>.min.css': 'css/rg2.css'
       }
     }
    },

    sync : {
      rel : {
        files: [{
          src : ['rg2api.php', 'index.php', 'app/**', 'html/**', 'img/favicon.ico'],
          dest : 'rel/'
        }],
        verbose: true,
        pretend: false, // Don't do any disk operations - just write log. Default: false
        failOnError: true, // Fail the task when copying is not possible. Default: false
        updateAndDelete: true
      },
     },

    bumpup : 'package.json',

    replace : {
      jsversion : {
        src : 'js/config.js',
        overwrite : true,
        replacements : [{
          from : /RG2VERSION.*\'/,
          to : "RG2VERSION: '<%= pkg.version %>'"
        }]
      },
      phpversion : {
        src : ['rg2api.php', 'index.php'],
        overwrite : true,
        replacements : [{
          from : /\(\'RG2VERSION\'.*\)/,
          to : "('RG2VERSION', '<%= pkg.version %>')"
        }]
      }
    },

   clean: {
      minified: ['js/*.min.js', 'js/*.js.map', 'css/*.min.css']
    }

  });

  // Load all the grunt tasks
  require('load-grunt-tasks')(grunt);

  for (var i = 0; i < clubs.length; i++) {
    var club = clubs[i];
    grunt.config(['sync', club], {
      files: [{
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/' + club + '/rg2/'
      }],
      verbose: true, // Default: false
      pretend: false, // Don't do any disk operations - just write log. Default: false
      failOnError: true, // Fail the task when copying is not possible. Default: false
      ignoreInDest: "rg2-config.php",
      updateAndDelete: true
    });
  };

  // clok has a different directory set-up
  grunt.config(['sync', 'clok'], {
    files: [{
      cwd : 'rel/',
      expand : true,
      src : '**',
      dest : 'ftpsite/clok/gadget/rg2/'
    }],
    verbose: true, // Default: false
    pretend: false, // Don't do any disk operations - just write log. Default: false
    failOnError: true, // Fail the task when copying is not possible. Default: false
    ignoreInDest: "rg2-config.php",
    updateAndDelete: true
  });

  grunt.registerTask('default', ['build']);

  // increment minor version number: do anything else by editting package.json by hand
  grunt.registerTask('bump', ['bumpup']);

  grunt.registerTask('build', ['clean:minified', 'csslint', 'cssmin', 'jshint:all', 'jshint:lang', 'uglify', 'build-manager' ]);

  grunt.registerTask('build-manager', ['jshint:manager', 'uglify:manager' ]);

  grunt.registerTask('deploy', ['replace:jsversion', 'replace:phpversion', 'build', 'sync:rel']);

};
