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
  
  var clubs = ['aire', 'bado', 'baoc', 'basoc', 'bko', 'boc', 'bok', 'bl', 'chig', 'claro', 'clok', 'clyde', 'cuoc', 'cvfr', 'darkandwhite', 'dee',
   'devonoc', 'ebor', 'ecko', 'elo', 'epoc', 'esoc', 'euoc', 'gmoa', 'gramp', 'go', 'happyherts', 'havoc', 'hoc', 'interlopers', 'invoc', 'jk',
   'kerno', 'kfo', 'lamm', 'leioc', 'loc', 'log', 'lok', 'lvo', 'maroc', 'mdoc', 'moravian', 'mvoc', 'nato', 'ngoc', 'noroc', 'nwo', 'od', 'omm', 'ouoc',
   'pfo', 'pow', 'quantock', 'rafo', 'roxburghreivers', 'sa', 'sarum', 'scottish6days', 'seloc', 'slow', 'smbo', 'smoc', 'sn', 'so', 'soa', 'soc', 'solway',
   'sportident', 'sroc', 'stag', 'start', 'suffoc', 'swoc', 'syo', 'tay', 'test', 'purple-thistle', 'tinto', 'tvoc', 'walton', 'waoc', 'wcoc', 'wim', 'wmoc',
   'wrekin', 'wsco', 'wsoe', 'wsx'];

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
        es3 : true,
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
          console : false
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

    'ftp-deploy' : {
      toweb : {
        auth : {
          host : ftpHost,
          port : 21,
          authKey : 'rg'
        },
        src : 'ftpsite/',
        dest : 'public_html/',
        exclusions : []
      }
    },
    sync : {
      rel : {
        src : ['js/**', 'css/**', 'img/**', 'rg2api.php', 'index.php', 'html/**', 'lang/**'],
        dest : 'rel/'
      },
      aire : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/aire/rg2/'
      },
      bado : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/bado/rg2/'
      },
      baoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/baoc/rg2/'
      },
      basoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/basoc/rg2/'
      },
      bko : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/bko/rg2/'
      },
      boc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/boc/rg2/'
      },
      bok : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/bok/rg2/'
      },
      bl : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/bl/rg2/'
      },
      chig : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/chig/rg2/'
      },
      clok : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/clok/gadget/rg2/'
      },
      claro : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/claro/rg2/'
      },
      clyde : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/clyde/rg2/'
      },
      cuoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/cuoc/rg2/'
      },
      cvfr : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/cvfr/rg2/'
      },
      darkandwhite : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/darkandwhite/rg2/'
      },
      dee : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/dee/rg2/'
      },
      devonoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/devonoc/rg2/'
      },
      ebor : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/ebor/rg2/'
      },
      ecko : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/ecko/rg2/'
      },
      elo : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/elo/rg2/'
      },
      epoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/epoc/rg2/'
      },
      esoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/esoc/rg2/'
      },
      euoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/euoc/rg2/'
      },
      gmoa : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/gmoa/rg2/'
      },
      gramp : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/gramp/rg2/'
      },
      go : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/go/rg2/'
      },
      happyherts : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/happyherts/rg2/'
      },
      havoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/havoc/rg2/'
      },
      hoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/hoc/rg2/'
      },
      interlopers : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/interlopers/rg2/'
      },
      invoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/invoc/rg2/'
      },
      jk : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/jk/rg2/'
      },
      kerno : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/kerno/rg2/'
      },
      kfo : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/kfo/rg2/'
      },
      lamm : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/lamm/rg2/'
      },
      leioc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/leioc/rg2/'
      },
      loc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/loc/rg2/'
      },
      log : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/log/rg2/'
      },
      lok : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/lok/rg2/'
      },
      lvo : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/lvo/rg2/'
      },
      maroc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/maroc/rg2/'
      },
      mdoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/mdoc/rg2/'
      },
      moravian : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/moravian/rg2/'
      },
      mvoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/mvoc/rg2/'
      },
      nato : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/nato/rg2/'
      },
      ngoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/ngoc/rg2/'
      },
      noroc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/noroc/rg2/'
      },
      nwo : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/nwo/rg2/'
      },
      od : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/od/rg2/'
      },
      omm : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/omm/rg2/'
      },
      ouoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/ouoc/rg2/'
      },
      pfo : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/pfo/rg2/'
      },
      pow : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/pow/rg2/'
      },
      quantock : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/quantock/rg2/'
      },
      rafo : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/rafo/rg2/'
      },
      roxburghreivers : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/roxburghreivers/rg2/'
      },
      sa : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/sa/rg2/'
      },
      sarum : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/sarum/rg2/'
      },
      scottish6days : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/scottish6days/rg2/'
      },
      sboc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/sboc/rg2/'
      },
      seloc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/seloc/rg2/'
      },
      slow : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/slow/rg2/'
      },
      smbo : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/smbo/rg2/'
      },
      smoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/smoc/rg2/'
      },
      sn : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/sn/rg2/'
      },
      so : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/soa/rg2/'
      },
      soa : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/soa/rg2/'
      },
      soc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/soc/rg2/'
      },
      solway : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/solway/rg2/'
      },
      sportident : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/sportident/rg2/'
      },
      sroc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/sroc/rg2/'
      },
      stag : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/stag/rg2/'
      },
      start : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/start/rg2/'
      },
      suffoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/suffoc/rg2/'
      },
      swoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/swoc/rg2/'
      },
      syo : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/syo/rg2/'
      },
      tay : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/tay/rg2/'
      },
      test : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/test/rg2/'
      },
      purplethistle : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/purple-thistle/rg2/'
      },
      tinto : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/tinto/rg2/'
      },
      tvoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/tvoc/rg2/'
      },
      walton : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/walton/rg2/'
      },
      waoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/waoc/rg2/'
      },
      wcoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/wcoc/rg2/'
      },
      wim : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/wim/rg2/'
      },
      wmoc : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/wmoc/rg2/'
      },
      wrekin : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/wrekin/rg2/'
      },
      wsco : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/wsco/rg2/'
      },
      wsoe : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/wsoe/rg2/'
      },
      wsx : {
        cwd : 'rel/',
        expand : true,
        src : '**',
        dest : 'ftpsite/wsx/rg2/'
      }
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

  grunt.registerTask('default', ['build']);

  // increment minor version number: do anything else by editting package.json by hand
  grunt.registerTask('bump', ['bumpup']);

  grunt.registerTask('build', ['clean:minified', 'csslint', 'jslint:all', 'jshint:all', 'concat:js', 'uglify', 'build-manager' ]);
  
  grunt.registerTask('build-manager', ['jslint:manager', 'jshint:manager', 'uglify:manager' ]);

  grunt.registerTask('deploy', ['replace:jsversion', 'replace:phpversion', 'build', 'sync:rel']);

};
