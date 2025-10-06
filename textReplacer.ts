import { PathLike } from "deno_pathlib"
import { red, blue } from "@std/fmt/color"

await runner()

async function runner() {
  await runnerHAR()
  await runner()
}

function textReplacer(text: string){
  const unknown2Text = (str: string) => {
    const bytes = new TextEncoder().encode(str)
    if (bytes.length != 6){
      return str
    }
    const [_b11, b12, _b21, b22, _b31, b32 ] = Array.from(bytes)
    return new TextDecoder().decode(new Uint8Array([ b12 + 64, b22, b32 ]))
  }

  return text.replace(/[âãåäéèç­æï]../g, (match) => unknown2Text(match))
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

  const old_name = file_p.stem
  const new_p = file_p.with_stem(old_name + "_new")
  await file_p.read_text().then(async txt => {
    await new_p.write_text(textReplacer(txt))
    await file_p.rename(file_p.with_stem(old_name + "_old"))
    console.log(`[${blue("create")}] new text at "${new_p.path}"\n`)
  })
}
