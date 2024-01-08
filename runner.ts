import { HarHandler } from "./harHandler.ts"
import { PathLike } from "https://raw.githubusercontent.com/nikogoli/deno_pathlib/dev/mod.ts"
import { red } from "https://deno.land/std@0.177.0/fmt/colors.ts"

await runner()

async function runner() {
  await runnerHAR()
  await runner()
}


async function runnerHAR (){
  const file_p = await findHar()
  if (file_p === null){ return }
  
  const handler = new HarHandler(file_p.path)  
  await handler.extractData()
}


async function path_getter(
  message: string,
){
  let file_p: PathLike | null = null
  while (file_p === null){
    const pathargs = prompt(message)
    if (pathargs){
      const temp_p = pathargs.includes(",")
        ? new PathLike(...pathargs.replaceAll(" ", "").split(","))
        : new PathLike(pathargs)
      
      await temp_p.exists()
        .catch(_er => {
          console.log(`[${red("error")}] ${temp_p.path} is not exists.\n`)
          file_p = null
        })
    }
  }
  return file_p
}


async function findHar(){
  const message = `Select\n\t 1. The har file exists in ./_input directory.\n\t 2. The har file exists in another directory.\n :`
  const selected = prompt(message)
  if (selected == "1"){
    const files = await new PathLike("_input").dirFiles()
    const index = prompt(`\n${files.map((fl, idx) => `${idx+1}. ${fl.name}`).join("\n")}\n:`)
    const fl = files.at(Number(index)-1)
    if (fl){
      return fl
    } else {
      console.log(`[${red("error")}] ${index} is out of range.\n`)
      return await findHar()
    }
  }
  else if (selected == "2"){
    return await path_getter(`Enter HAR file path (sep by ',')\n  (cwd is ${Deno.cwd()})\n :`)
  }
  else {
    return null
  }
}