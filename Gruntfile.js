module.exports = function(grunt) {
  var jsFileList = ['js/rg2.js', 'js/animation.js', 'js/canvas.js', 'js/config.js', 'js/control.js', 'js/controls.js', 'js/course.js', 'js/courseparser.js', 'js/courses.js', 'js/draw.js', 'js/event.js',
    'js/events.js', 'js/gpstrack.js', 'js/handles.js', 'js/map.js', 'js/plugins.js', 'js/result.js', 'js/resultparser.js', 'js/resultparsercsv.js', 'js/resultparseriofv2.js','js/resultparseriofv3.js',
    'js/results.js', 'js/rg2getjson.js', 'js/rg2input.js', 'js/rg2ui.js', 'js/runner.js', 'js/utils.js', 'js/lib/he.js'];

  var cssFileList = ['css/rg2.css'];

  // don't jsHint he.js, plugins.js
  var jsHintList = ['js/rg2.js', 'js/animation.js', 'js/canvas.js', 'js/config.js', 'js/control.js', 'js/controls.js', 'js/course.js', 'js/courseparser.js', 'js/courses.js', 'js/draw.js', 'js/event.js',
    'js/events.js', 'js/gpstrack.js', 'js/handles.js', 'js/map.js', 'js/result.js', 'js/resultparser.js', 'js/results.js', 'js/rg2getjson.js', 'js/rg2input.js', 'js/rg2ui.js', 'js/runner.js', 'js/utils.js'];

  var jsManagerSrc = ['js/manager.js', 'js/resultparseriofv2.js', 'js/resultparseriofv3.js', 'js/resultparsercsv.js', 'js/resultparser.js', 'js/courseparser.js', 'js/managerui.js'];

  var jsConcatFile = 'js/rg2all.js';

  var jsMinFile = 'js/rg2all.min.js';
  var jsManagerMinFile = 'js/rg2manager.min.js';

  var relDir = 'ftpsite/';

  var ftpHost = 'ftp.routegadget.co.uk';

  // installed routegadget.co.uk clubs that need to be updated for a new release
  // careful: clok has a different config so is set up separately
  var clubs = ['aire', 'bado', 'baoc', 'basoc', 'bko', 'boc', 'bok', 'bl', 'chig', 'claro', 'clyde', 'coboc', 'cuoc', 'cvfr', 'darkandwhite', 'dee',
   'devonoc', 'ebor', 'ecko', 'elo', 'epoc', 'esoc', 'euoc', 'gmoa', 'gramp', 'go', 'happyherts', 'havoc', 'hoc', 'interlopers', 'invoc', 'jk',
   'kerno', 'kfo', 'lamm', 'leioc', 'loc', 'log', 'lok', 'lvo', 'maroc', 'mdoc', 'moravian', 'mvoc', 'nato', 'ngoc', 'noroc', 'nwo', 'od', 'omm', 'ouoc',
   'pfo', 'potoc', 'pow', 'quantock', 'rafo', 'roxburghreivers', 'sa', 'sarum', 'saxons', 'sboc', 'scottish6days', 'seloc', 'slow', 'smbo', 'smoc', 'sn', 'so', 'soa', 'soc', 'solway',
   'sportident', 'sroc', 'stag', 'start', 'suffoc', 'swoc', 'syo', 'tay', 'test', 'purple-thistle', 'tinto', 'tvoc', 'walton', 'waoc', 'wcoc', 'wim', 'wmoc',
   'wrekin', 'wsco', 'wsco2008', 'wsoe', 'wsx'];
  
  // Project configuration.
  grunt.initConfig({
    pkg : grunt.file.readJSON('package.json'),

    concat : {
      js : {
        src : jsFileList,

        dest : jsConcatFile,

        options : {
          banner : '// Version <%= pkg.version %> <%= grunt.template.today("isoDateTime") %>;\n'

        }
      }
    },

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
      src: cssFileList
    },

    uglify : {
      options : {
        banner : '// Version <%= pkg.version %> <%= grunt.template.today("isoDateTime") %>;\n'
      },
      build : {
        src : jsConcatFile,
        dest : jsMinFile
      },
      manager : {
        src : jsManagerSrc,
        dest : jsManagerMinFile
      }
    },

    sync : {
      rel : {
        files: [{
          src : ['js/**', 'css/**', 'img/**', 'rg2api.php', 'index.php', 'html/**', 'lang/**'],
          dest : 'rel/'
        }],
        verbose: true, // Default: false 
        pretend: false, // Don't do any disk operations - just write log. Default: false 
        failOnError: true, // Fail the task when copying is not possible. Default: false 
        updateAndDelete: true
      },
     },

    bumpup : 'package.json',

    replace : {
      config : {
        src : ['rel/rg2-config-template.php'],
        dest : 'rel/<%= ftp.club %>/rg2-config.php',
        replacements : [{
          from : '<club>',
          to : '<%= ftp.club %>'
        }]
      },
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

    jslint: {
      all: {
        src: jsHintList,
        exclude: [],
        directives: {
          indent: 2,
          // allow browser variables (window...)
          browser: true,
          // don't require use strict
          sloppy: true,
          // allow TODO comments
          todo: true,
          // allow console and alert
          //devel: true,
          predef: ['$', 'FileReader']
        },
        options: {
          failOnError: false
        }
      },
      manager: {
        src: jsManagerSrc,
        exclude: [],
        directives: {
          indent: 2,
          // allow browser variables (window...)
          browser: true,
          // don't require use strict
          sloppy: true,
          // allow TODO comments
          todo: true,
          predef: ['$', 'FileReader']
        },
        options: {
          failOnError: false
        }
      }
    },

   clean: {
      minified: ['js/rg2all.js', 'js/rg2all.min.js', 'js/rg2manager.min.js']
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
    updateAndDelete: true
  });
  
  grunt.registerTask('default', ['build']);

  // increment minor version number: do anything else by editting package.json by hand
  grunt.registerTask('bump', ['bumpup']);

  grunt.registerTask('build', ['clean:minified', 'csslint', 'jslint:all', 'jshint:all', 'concat:js', 'uglify', 'build-manager' ]);

  grunt.registerTask('build-manager', ['jslint:manager', 'jshint:manager', 'uglify:manager' ]);

  grunt.registerTask('deploy', ['replace:jsversion', 'replace:phpversion', 'build', 'sync:rel']);

};