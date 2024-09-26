/* eslint-env node */
module.exports = function (grunt) {
  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),

    clean: {
      website: ["website/*"]
    },

    copy: {
      distfiles: {
        // Run after a new build to copy other files that are needed for an installation.
        // Could possibly do this via public directory in vite (as done for img)
        // but needs further investigation.
        files: [
          { expand: true, nonull: true, src: ["index.php"], dest: "dist/" },
          { expand: true, nonull: true, src: ["rg2api.php"], dest: "dist/" },
          { expand: true, nonull: true, flatten: true, src: ["dist/.vite/manifest.json"], dest: "dist/" },
          { expand: true, nonull: true, src: ["lang/*"], dest: "dist/" },
          { expand: true, nonull: true, src: ["app/**"], dest: "dist/" }
        ],
        mode: true,
        timestamp: true
      }
    },

    replace: {
      jsversion: {
        src: ["src/js/config.js"],
        overwrite: true,
        replacements: [
          {
            from: /RG2VERSION.*,/,
            to: "RG2VERSION: '<%= pkg.version %>',"
          }
        ]
      },
      phpversion: {
        src: ["rg2api.php", "index.php"],
        overwrite: true,
        replacements: [
          {
            from: /\('RG2VERSION'.*\)/,
            to: "('RG2VERSION', '<%= pkg.version %>')"
          }
        ]
      }
    }
  })

  // Load all the grunt tasks
  require("load-grunt-tasks")(grunt)

  // register tasks to copy relevant files for each subdomain to a directory
  // structure under website that can be synced via FTP to the routegadget.co.uk server
  for (let i = 0; i < clubs.length; i++) {
    let club = clubs[i]
    // careful: CLOK still has historic directory structure
    let dest =
      club === "clok"
        ? "website/" + club + ".routegadget.co.uk/public_html/gadget/rg2/"
        : "website/" + club + ".routegadget.co.uk/public_html/rg2/"
    grunt.config(["copy", club], {
      files: [
        { expand: true, nonull: true, src: ["app/**"], dest: dest },
        { expand: true, nonull: true, src: ["lang/**"], dest: dest },
        { expand: true, nonull: true, src: ["index.php"], dest: dest },
        { expand: true, nonull: true, src: ["rg2api.php"], dest: dest },
        {
          expand: true,
          nonull: true,
          flatten: true,
          src: ["dist/manifest.json"],
          dest: dest
        }
      ],
      mode: true,
      timestamp: true
    })
  }

  grunt.registerTask("default", ["deploy"])
  grunt.registerTask("deploy", ["clean:website", "copy"])
}

// installed routegadget.co.uk clubs that need to be updated for a new release
const clubs = [
  "aire",
  "albania",
  "ayroc",
  "bado",
  "baoc",
  "basoc",
  "bko",
  "bmbo",
  "boc",
  "bok",
  "bl",
  "chig",
  "claro",
  "clok",
  "clyde",
  "coboc",
  "croeso",
  "cuoc",
  "cvfr",
  "darkandwhite",
  "dee",
  "dfok",
  "devonoc",
  "dvo",
  "ebor",
  "ecko",
  "elcols",
  "elo",
  "epoc",
  "eryri",
  "esoc",
  "euoc",
  "explorerevents",
  "fvo",
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
  "jros",
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
  "nn",
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
  "sl-2020",
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
  "waroc",
  "wcoc",
  "wim",
  "wmoc",
  "wrekin",
  "wsco2008",
  "wsx"
]
