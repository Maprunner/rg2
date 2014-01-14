module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    
    concat: {
      js: {
      	src: ['js/rg2.js', 'js/animation.js', 'js/controls.js', 'js/courses.js', 'js/manager.js',
       'js/draw.js', 'js/events.js', 'js/gpstrack.js', 'js/results.js', 'js/runner.js', 'js/plugins.js'],
      
        dest: 'js/rg2all.js',
        
        options: {
          separator: ';',
        }
      }    	
    },

    jshint: {
    	build: {
      	src: ['js/rg2.js', 'js/animation.js', 'js/controls.js', 'js/courses.js', 'js/manager.js',
       'js/draw.js', 'js/events.js', 'js/gpstrack.js', 'js/results.js', 'js/runner.js', 'js/plugins.js']
      },  	
    },
    
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd hh:mm-ss") %> */\n'
      },
      build: {
        src: 'js/<%= pkg.name %>all.js',
        dest: 'js/<%= pkg.name %>all.min.js'
      }
    },
    
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};