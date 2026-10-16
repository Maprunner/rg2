import fs from "fs-extra"
import path from "node:path"
import { readFile, writeFile } from "node:fs/promises"

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

const copyOptions = { preserveTimestamps: true }

async function copyVersionedPhp(source, destination, version) {
  const php = await readFile(source, "utf8")
  const versionDefinition = /define\('RG2VERSION',\s*'[^']*'\);/

  if (!versionDefinition.test(php)) {
    throw new Error(`Could not find RG2VERSION definition in ${source}`)
  }

  const output = php.replace(versionDefinition, `define('RG2VERSION', '${version}');`)
  await writeFile(destination, output)
}

export function rg2BuildPlugin({ root, mode, version }) {
  const dist = path.join(root, "dist")
  const website = path.join(root, "website")
  const isDeploy = mode === "deploy"

  return {
    name: "rg2-release-files",
    apply: "build",
    async buildStart() {
      if (isDeploy) {
        await fs.remove(website)
      }
    },
    async closeBundle() {
      await Promise.all([
        fs.copy(path.join(root, "app"), path.join(dist, "app"), copyOptions),
        fs.copy(path.join(root, "lang"), path.join(dist, "lang"), copyOptions),
        copyVersionedPhp(path.join(root, "index.php"), path.join(dist, "index.php"), version),
        copyVersionedPhp(path.join(root, "rg2api.php"), path.join(dist, "rg2api.php"), version),
        fs.copy(path.join(dist, ".vite", "manifest.json"), path.join(dist, "manifest.json"), copyOptions)
      ])

      if (!isDeploy) {
        return
      }

      await Promise.all(
        clubs.map(async (club) => {
          const subdomainPath = club === "clok" ? "gadget/rg2" : "rg2"
          const destination = path.join(
            website,
            `${club}.routegadget.co.uk`,
            "public_html",
            subdomainPath
          )

          await Promise.all([
            fs.copy(path.join(dist, "app"), path.join(destination, "app"), copyOptions),
            fs.copy(path.join(dist, "lang"), path.join(destination, "lang"), copyOptions),
            fs.copy(path.join(dist, "index.php"), path.join(destination, "index.php"), copyOptions),
            fs.copy(path.join(dist, "rg2api.php"), path.join(destination, "rg2api.php"), copyOptions),
            fs.copy(path.join(dist, "manifest.json"), path.join(destination, "manifest.json"), copyOptions)
          ])
        })
      )
    }
  }
}
