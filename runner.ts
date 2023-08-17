import { HarHandler } from "./harHandler.ts"
import { PathLike } from "https://pax.deno.dev/nikogoli/deno_pathlib@0.0.3"
import { red } from "https://deno.land/std@0.177.0/fmt/colors.ts"

await runner()

async function runner() {
  await runnerHAR()
  await runner()
}

async function path_getter(props:{
  message: string,
  args?: Array<string>,
  createPath?: (args: Array<string>) => PathLike,
}){
  const { message, args } = props
  const createPath = props.createPath ? props.createPath : (args: Array<string>) => new PathLike(...args)
  let file_p: PathLike
  if (args){
    file_p = createPath(args)
  } else {
    let temp_p: PathLike | null = null
    while (temp_p === null){
      const pathargs = prompt(message)
      if (pathargs === null){
        return null
      }
      temp_p = createPath(pathargs.replaceAll(" ", "").split(","))
      const is_exist = await temp_p.exists()
      if (is_exist === false){
        console.log(`[${red("error")}] ${temp_p.path} is not exists.\n`)
        temp_p = null
      }
    }
    file_p = temp_p
  }
  return file_p
}


async function runnerHAR (args?: Array<string>){
  const message = `Enter HAR file path (sep by ',')\n  (cwd is ${Deno.cwd()})\n :`
  const createPath = (args: Array<string>) => new PathLike(import.meta.url).relativepath({from:"file"}, ...args)
  const file_p = await path_getter({message, createPath, args})
  if (file_p === null){ return }
  
  const handler = new HarHandler(file_p.path)  
  await handler.extractData()
}