import { formatSecsAsMMSS, getSecsFromHHMM, getSecsFromHHMMSS } from "./utils"

export class ResultParserCSV {
  constructor(rawCSV) {
    this.results = []
    this.CSVFormat = {}
    this.separator = ""
    this.valid = true
    this.processResultsCSV(rawCSV)
    return { results: this.results, valid: this.valid }
  }

  extractResult(fields, course, controls) {
    const FIRST_NAME_IDX = 0
    const SURNAME_IDX = 1
    const CLUB_IDX = 2
    const START_TIME_IDX = 3
    let result = {}
    result.chipid = 0
    result.name = (fields[FIRST_NAME_IDX] + " " + fields[SURNAME_IDX] + " " + fields[CLUB_IDX]).trim()
    result.dbid = result.chipid + "__" + result.name
    result.starttime = getSecsFromHHMM(fields[START_TIME_IDX])
    result.club = fields[CLUB_IDX]
    result.course = course
    result.controls = controls
    const info = this.extractSpklasseSplits(fields)
    result.splits = info.splits
    result.codes = info.codes
    result.time = formatSecsAsMMSS(info.totaltime)
    this.results.push(result)
  }

  extractSingleCSVResult(fields) {
    let result = {}
    result.valid = true
    result.chipid = fields[this.CSVFormat.CHIP_IDX]
    // delete quotes from CSV file: output from MERCS
    result.name = (fields[this.CSVFormat.FIRST_NAME_IDX] + " " + fields[this.CSVFormat.SURNAME_IDX])
      .trim()
      .replace(/"/g, "")
    result.dbid = fields[this.CSVFormat.DB_IDX]
    result.starttime = getSecsFromHHMMSS(fields[this.CSVFormat.START_TIME_IDX])
    result.time = fields[this.CSVFormat.TOTAL_TIME_IDX]
    result.position = this.getPosition(fields)
    result.status = this.getSICSVStatus(fields[this.CSVFormat.NC_IDX], fields[this.CSVFormat.CLASSIFIER_IDX])
    result.club = fields[this.CSVFormat.CLUB_IDX].trim().replace(/"/g, "")
    result.course = fields[this.CSVFormat.COURSE_IDX]
    if (result.course === "") {
      result.valid = false
    }
    result.controls = parseInt(fields[this.CSVFormat.NUM_CONTROLS_IDX], 10)
    const info = this.extractSISplits(fields, result.controls)
    result.splits = info.splits
    // add finish split
    if (result.splits !== "") {
      result.splits += ";"
    }
    result.splits += getSecsFromHHMMSS(result.time)
    result.codes = info.codes
    return result
  }

  extractSISplits(fields, controls) {
    let nextsplit = this.CSVFormat.FIRST_SPLIT_IDX
    let nextcode = this.CSVFormat.FIRST_CODE_IDX
    let result = {}
    result.splits = ""
    result.codes = []
    for (let i = 0; i < controls; i += 1) {
      if (fields[nextcode]) {
        if (i > 0) {
          result.splits += ";"
        }
        result.codes[i] = fields[nextcode]
        result.splits += getSecsFromHHMMSS(fields[nextsplit])
      }
      nextsplit += this.CSVFormat.STEP
      nextcode += this.CSVFormat.STEP
    }
    return { splits: result.splits, codes: result.codes }
  }

  extractSpklasseSplits(fields) {
    const FIRST_SPLIT_IDX = 4
    let splits = ""
    let codes = []
    let totaltime = 0
    for (let i = 0; i < fields.length - FIRST_SPLIT_IDX; i += 1) {
      if (i > 0) {
        splits += ";"
      }
      codes[i] = "X"
      totaltime += getSecsFromHHMMSS(fields[i + FIRST_SPLIT_IDX])
      splits += totaltime
    }
    return { splits: splits, codes: codes, totaltime: totaltime }
  }

  getCSVFormat(headers) {
    // not a pretty function but it should allow some non-standard CSV formats to be processed such as OEScore output
    const titles = [
      "si card",
      "database id",
      "surname",
      "first name",
      "nc",
      "start",
      "time",
      "classifier",
      "city",
      "short",
      "course",
      "course controls",
      "pl",
      "start punch",
      "control1",
      "punch1",
      "control2"
    ]
    let values = []
    const fields = headers.split(this.separator).map(function (str) {
      return str.toLowerCase()
    })
    let found = false
    for (let i = 0; i < titles.length; i += 1) {
      found = false
      for (let j = 0; j < fields.length; j += 1) {
        if (fields[j] === titles[i]) {
          values[i] = j
          found = true
          break
        }
        // horrid hacks to handle semi-compliant files
        if ("si card" === titles[i]) {
          if ("chipno" === fields[j] || "sicard" === fields[j] || "database id" === fields[j]) {
            values[i] = j
            found = true
            break
          }
        }
        if ("nc" === titles[i]) {
          if ("classifier" === fields[j]) {
            values[i] = j
            found = true
            break
          }
        }
        if ("city" === titles[i]) {
          if ("club" === fields[j]) {
            values[i] = j
            found = true
            break
          }
        }
        if ("pl" === titles[i]) {
          if ("place" === fields[j]) {
            values[i] = j
            found = true
            break
          }
        }
      }
      if (!found) {
        // stop if we didn't find what we needed
        break
      }
    }

    if (!found) {
      // default to BOF CSV format
      //not sure of this is really a good idea but it has always been like this...
      values = [1, 2, 3, 4, 8, 9, 11, 12, 15, 18, 39, 42, 43, 44, 46, 47, 48]
    }
    this.setCSVFormat(values)
  }

  getPosition(fields) {
    let position = parseInt(fields[this.CSVFormat.POSITION_IDX], 10)
    if (isNaN(position)) {
      position = ""
    }
    return position
  }

  getSICSVStatus(nc, classifier) {
    if (nc === "0" || nc === "" || nc === "N" || nc === "n") {
      if (classifier === "" || classifier === "0") {
        return "ok"
      }
      return "nok"
    }
    return "nc"
  }

  // rows: array of raw lines from SI results csv file
  processCSVResults(rows) {
    // extract what we need: first row is headers so ignore
    for (let i = 1; i < rows.length; i += 1) {
      const fields = rows[i].split(this.separator)
      // need at least this many fields...
      if (fields.length >= this.CSVFormat.FIRST_SPLIT_IDX) {
        let newResult = this.extractSingleCSVResult(fields)
        if (newResult.valid) {
          // don't need this field any more
          delete newResult.valid
          this.results.push(newResult)
        }
      }
    }
  }

  processResultsCSV(rawCSV) {
    const rows = rawCSV.split(/[\r\n|\n]+/)
    // try and work out what the separator is
    const commas = rows[0].split(",").length - 1
    const semicolons = rows[0].split(";").length - 1
    if (commas > semicolons) {
      this.separator = ","
    } else {
      this.separator = ";"
    }
    // Spklasse has two items on first row, SI CSV has a lot more...
    if (rows[0].split(this.separator).length === 2) {
      this.processSpklasseCSVResults(rows)
    } else {
      this.getCSVFormat(rows[0])
      this.processCSVResults(rows)
    }
  }

  // rows: array of raw lines from Spklasse results csv file
  processSpklasseCSVResults(rows) {
    // fields in course row
    const COURSE_IDX = 0
    const NUM_CONTROLS_IDX = 1
    let fields = []
    let course = ""
    let controls = 0
    // read through all rows
    for (let i = 0; i < rows.length; i += 1) {
      fields = rows[i].split(this.separator)
      // check for new course
      if (fields.length === 2) {
        course = fields[COURSE_IDX]
        controls = parseInt(fields[NUM_CONTROLS_IDX], 10)
      } else {
        this.extractResult(fields, course, controls)
      }
    }
  }

  setCSVFormat(values) {
    this.CSVFormat.CHIP_IDX = values[0]
    this.CSVFormat.DB_IDX = values[1]
    this.CSVFormat.SURNAME_IDX = values[2]
    this.CSVFormat.FIRST_NAME_IDX = values[3]
    this.CSVFormat.NC_IDX = values[4]
    this.CSVFormat.START_TIME_IDX = values[5]
    this.CSVFormat.TOTAL_TIME_IDX = values[6]
    this.CSVFormat.CLASSIFIER_IDX = values[7]
    this.CSVFormat.CLUB_IDX = values[8]
    this.CSVFormat.CLASS_IDX = values[9]
    this.CSVFormat.COURSE_IDX = values[10]
    this.CSVFormat.NUM_CONTROLS_IDX = values[11]
    this.CSVFormat.POSITION_IDX = values[12]
    this.CSVFormat.START_PUNCH_IDX = values[13]
    this.CSVFormat.FIRST_CODE_IDX = values[14]
    this.CSVFormat.FIRST_SPLIT_IDX = values[15]
    this.CSVFormat.STEP = values[16] - values[14]
  }
}
