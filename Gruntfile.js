module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg : grunt.file.readJSON('package.json'),

    concat : {
      js : {
        src : ['js/rg2.js', 'js/animation.js', 'js/controls.js', 'js/courses.js', 'js/manager.js', 'js/draw.js', 'js/events.js', 'js/gpstrack.js', 'js/results.js', 'js/runner.js', 'js/plugins.js'],

        dest : 'js/rg2all.js',

        options : {
          //separator : ';'
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
        //unused: true,
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
      all : {
        src : ['js/rg2.js', 'js/animation.js', 'js/controls.js', 'js/courses.js', 'js/manager.js', 'js/draw.js', 'js/events.js', 'js/gpstrack.js', 'js/results.js', 'js/runner.js', 'js/plugins.js']
      },
      min : {
        src : ['js/rg2all.js']
      }
    },

    uglify : {
      options : {
        banner : 'var rg2VersionInfo = "<%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd hh:mm:ss") %>";\n'
      },
      build : {
        src : 'js/<%= pkg.name %>all.js',
        dest : 'js/<%= pkg.name %>all.min.js'
      }
    },

    'ftp-deploy' : {
      build : {
        auth : {
          host : 'ftp.routegadget.co.uk',
          port : 21,
          authKey : 'hh'
        },
        src : 'C:/xampp/htdocs/rg2/rel',
        dest : '/rg2',
        exclusions : ['']
      }
    },
    clean : {
      release : ["C:/xampp/htdocs/rg2/rel"]
    },
    copy : {
      api : {
        src : 'C:/xampp/htdocs/rg2/rg2api.php',
        dest : 'C:/xampp/htdocs/rg2/rel'
      },
      index : {
        src : 'C:/xampp/htdocs/rg2/index.php',
        dest : 'C:/xampp/htdocs/rg2/rel'
      },
      js : {
        src : 'C:/xampp/htdocs/rg2/js/*',
        dest : 'C:/xampp/htdocs/rg2/rel/js'
      },
      css : {
        src : 'C:/xampp/htdocs/rg2/css/*',
        dest : 'C:/xampp/htdocs/rg2/rel/css'
      },
      img : {
        src : 'C:/xampp/htdocs/rg2/img/*',
        dest : 'C:/xampp/htdocs/rg2/rel/img'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-ftp-deploy');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // Default task(s).
  grunt.registerTask('default', ['build']);

  grunt.registerTask('build', ['jshint:all', 'concat', 'uglify']);

  grunt.registerTask('deploy', ['build', 'clean:release', 'ftp-deploy']);

  grunt.registerTask('hintmin', ['jshint:min']);
};
