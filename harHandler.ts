import { decode as base64Decode } from "https://deno.land/std@0.177.0/encoding/base64.ts"
import { ensureDir } from "https://deno.land/std@0.177.0/fs/mod.ts"
import { blue, green, red, yellow } from "https://deno.land/std@0.177.0/fmt/colors.ts"

import { PathLike } from "https://pax.deno.dev/nikogoli/deno_pathlib@0.0.3"
import { LogType } from "./types.ts"


export const FILELIST_NAME = "MainFiles.json"


export class HarHandler {
  output_dir: PathLike;
  #unity_dir: PathLike;
  #image_dir: PathLike;
  #sound_dir: PathLike;
  #acbawb_dir: PathLike;
  #unknown_dir: PathLike;
  #misc_dir: PathLike;
  #icon_dir: PathLike;
  #file_p: PathLike;
  loggs: Logs;
  #textReplacer: ((tx:string)=>string);

  constructor(file_path:string, root?:string, textReplacer?:(tx:string)=>string) {
    this.#file_p = new PathLike(file_path)
    const root_path = root ? [root, "_output"] : ["_output"]
    const _path = new PathLike(...root_path, this.#file_p.stem)
    this.output_dir = new PathLike(_path.resolve())
    this.#unity_dir = new PathLike(this.output_dir, "unity3d")
    this.#image_dir = new PathLike(this.output_dir, "image")
    this.#sound_dir = new PathLike(this.output_dir, "sound")
    this.#acbawb_dir = new PathLike(this.output_dir, "acb_awb")
    this.#unknown_dir = new PathLike(this.output_dir, "unkown_bytes")
    this.#misc_dir = new PathLike(this.output_dir, "misc")
    this.#icon_dir = new PathLike(this.output_dir, "icon")
    this.#textReplacer = textReplacer ?? ((tx) => tx)
    this.loggs = new Logs()
  }

  async extractData(){
    await [
      this.output_dir, this.#unity_dir, this.#image_dir, this.#sound_dir,
      this.#acbawb_dir, this.#unknown_dir, this.#misc_dir, this.#icon_dir
    ].reduce((pre,p) => pre.then(async () => await ensureDir(p.path)), Promise.resolve())

    const HAR_Data = await this.#file_p.read_JSON<{log:LogType}>()


    await HAR_Data.log.entries.reduce(
      (pre, entry, idx) => pre.then( async () => {
        this.loggs.onlylog("start", `entry ${idx} (entry-time-stamp: ${entry.startedDateTime})`)

        const { url } = entry.request
        const { mimeType, text, encoding } = entry.response.content
        if (text){
          if (entry._resourceType == "image"){
            await this.#handle_image(url, mimeType, text, encoding, idx)
          }
          else if (mimeType.split(";")[0].includes("image")){
            await this.#handle_image(url, mimeType, text, encoding, idx)
          }
          else if (mimeType.split(";")[0] == "application/json"){
            await this.#handle_XHR_applicationJSON(url, text, idx)
          }
          else if (mimeType.split(";")[0] == "text/plain"){
            await this.#handle_XHR_plainText(url, text, idx)
          }
          else if (mimeType.split(";")[0] == "audio/mpeg"){
            await this.#handle_XHR_audioMpeg(url, text, idx)
          }
          else if (mimeType.split(";")[0].includes("octet-stream")){
            await this.#handle_XHR_bynaryOcted(url, text, encoding, idx)
          }
          else {
            if (entry.response.content.comment && entry.response.content.comment == "応答ボディは省略しました。"){
              this.loggs.log("", `\t ${red("ブラウザによって省略")}：${url}`)
            }
            this.loggs.log(yellow("skip"), `handling for '${mimeType}' is not defined.`)
          }
          this.loggs.onlylog("End", `\n`)
        } else {
          this.loggs.log(yellow("skip"), `(mimeType: ${mimeType}): response.content.text NOT exist.`)
          this.loggs.onlylog("Skip", `\n`)
          if (mimeType.includes("image") || mimeType.includes("mpeg")){
            const pathname = new URL(url).pathname
            const name = pathname.split("/").at(-1)!
            this.loggs.set_info(new PathLike(name), url, true)
          }
        }
      })
    , Promise.resolve())

    await new PathLike(this.output_dir, "log.txt").write_text(this.loggs.logs.join("\n"))
    const filelist_p = new PathLike(this.output_dir, FILELIST_NAME)
    await filelist_p.write_text(
      JSON.stringify({list: this.loggs.file_infos}, null, 2)
    )
    console.log(" -------- Handling conmplete!! --------")
    console.log(`output files are in: ${green(this.output_dir.path)}`)
    console.log(`files list is: ${green(filelist_p.path)}\n`)

    if (this.loggs.failed.length > 0){
      console.log(`some fail are exist. Please check [${red("fail.json")}]\n`)
      await new PathLike(this.output_dir, "fail.json")
          .write_JSON({failed:this.loggs.failed}, {space:2})
      return false 
    } else {
      return filelist_p.name
    }
  }


  async #handle_image(
    url: string,
    mimeType: string,
    text: string,
    encoding: string | undefined,
    idx: number,
  ){
    const name = url.split("/").at(-1)!
    if (name.includes(".") == false){
      this.loggs.handleError(
        `retirieve file_name from ${url} faild: at entry ${idx}`,
        mimeType, text, encoding, idx
      )
    } else {
      const file_p = (name.includes("icon") || name.includes("Icon") || name.includes("ICON"))
          ? new PathLike(this.#icon_dir, name.replace("?", "_"))
          : new PathLike(this.#image_dir, name.replace("?", "_"))
      if (encoding == "base64"){
        try {
          await file_p.write_bytes(base64Decode(text))
          this.loggs.onlylog("", `\t${mimeType}`)
          this.loggs.log(blue("creat"), `${file_p.name}`)
          this.loggs.set_info(file_p, new URL(url).pathname)
        } catch (error) {
          this.loggs.log(red("ERROE (img)"), `${file_p.name}\n${error}\n`)
        }
      } else {
        this.loggs.handleError(
          `cannot handle image-encode ${encoding}: at entry ${idx}`,
          mimeType, text, encoding, idx
        )
      }
    }
  }


  async #handle_XHR_applicationJSON(
    url: string,
    text: string,
    idx: number,
  ) {
    const name = url.split("/").at(-1)
    const file_p = new PathLike(
      this.#misc_dir,
      (name == undefined)
        ? `${idx}.json`
        : (name.includes(".") == false) ? `${idx}_${name.slice(-15,)}.json`.replaceAll("?", "").replaceAll("=", "")
        : name
    )
  
    try {
      const j_data = JSON.parse(text)
      await file_p.write_JSON(j_data, {space:2})
      this.loggs.onlylog("", `\tjson`)
      this.loggs.log(blue("create"), `${file_p.name}`)
    } catch (error) {
      if (error instanceof SyntaxError){
        const new_p = file_p.with_suffix(".json.unknown_codec")
        await new_p.write_text(text)
        this.loggs.onlylog("", `\tjson (SyntaxError)`)
        this.loggs.log(blue("create"), `${new_p.name}`) 
      } else {
        throw error
      }
    }
  }


  async #handle_XHR_plainText(
    url: string,
    text: string,
    idx: number,
  ) {
    const name = url.split("/").at(-1)!
    const file_p = (name == undefined || name.includes(".") == false)
      ? new PathLike(this.#misc_dir, `${idx}.txt`)
      : new PathLike(this.#misc_dir, name)
    await file_p.write_text(this.#textReplacer(text))
    this.loggs.onlylog("", `\ttext/plain`)
    this.loggs.log(blue("create"), file_p.name)
  }


  async #handle_XHR_audioMpeg(
    url: string,
    text: string,
    idx: number,
  ) {
    const name = url.split("/").at(-1)!
    const file_p = (name == undefined || name.includes(".") == false)
      ? new PathLike(this.#sound_dir, `${idx}.mp3`)
      : new PathLike(this.#sound_dir, name)
    await file_p.write_bytes(base64Decode(text))
    this.loggs.onlylog("", `\tmp3`)
    this.loggs.log(blue("create"), file_p.name)
    this.loggs.set_info(file_p, new URL(url).pathname)
  }

  
  async #handle_XHR_bynaryOcted(
    url: string,
    text: string,
    encoding: string | undefined,
    idx: number,
  ) {
    const textDecoder = new TextDecoder('utf-8')
    const name = url.split("/").at(-1)!
    
    if (name.endsWith(".plist")){
      const file_p = new PathLike(this.#misc_dir, name)
      const data = textDecoder.decode(base64Decode(text))
      await file_p.write_text(data)
      this.loggs.onlylog("", `\tplist`)
      this.loggs.log(blue("create"), file_p.name)
      this.loggs.set_info(file_p, new URL(url).pathname)
    }
    else if (name.endsWith(".unity3d")){
      const file_p = new PathLike(this.#unity_dir, name)
      await file_p.write_bytes(base64Decode(text))
      this.loggs.onlylog("", `\tunity3d`)
      this.loggs.log(blue("create"), file_p.name)
    }
    else {
      const name = `${idx}_byteFile`
      const texted = (encoding == "base64") ? textDecoder.decode(base64Decode(text)) : text
      if (texted.startsWith("UnityFS")){
        const cab = texted.match(/CAB-[a-z\d]{32}/)
        const file_p = new PathLike(this.#unity_dir, (cab ? cab[0] : name)+ ".unity3d") 
        await file_p.write_bytes(base64Decode(text))
        this.loggs.onlylog("", `\tunity3d`)
        this.loggs.log(blue("create"), file_p.name)
      }
      else if (texted.startsWith("@UTF")){
        const file_p = new PathLike(this.#acbawb_dir, name + ".acb")
        await file_p.write_bytes(base64Decode(text))
        await this.#Appry_vgmstresm(file_p.path, true, url)
      }
      else if (texted.slice(4,12) == "ftypisom"){
        const file_p = new PathLike(this.#sound_dir, name +  "_somemp4")
        await file_p.write_bytes(base64Decode(text))
        await this.#Appry_vgmstresm(file_p.path, false, url)
      }
      else if (texted.startsWith("AFS2")){
        const file_p = new PathLike(this.#acbawb_dir, name + ".acb")
        await file_p.write_bytes(base64Decode(text))
        this.loggs.onlylog("", `\tawb`)
        this.loggs.log(blue("create"), file_p.name)
      }
      else {
        const file_p = new PathLike(this.#unknown_dir, name + "_unknown")
        await file_p.write_bytes(base64Decode(text))
        this.loggs.onlylog("", `\tbytes (unknown)`)
        this.loggs.log(blue("create"), file_p.name)
      }
    }
  }


  async #Appry_vgmstresm(
    file_path: string,
    is_acb: boolean,
    url: string,
  ){
    const file_p = new PathLike(file_path)
    const command = new Deno.Command("C:\\Users\\kmnao\\OneDrive\\ドキュメント\\いろいろ\\vgmstream-win\\test.exe", {
      args: (is_acb)
          ? ["-o", new PathLike(this.#sound_dir, "?n.wav").path, file_path]
          : [file_path],
      stdout: "piped"
    })    
    const status = await command.output()
  
    const msg = new TextDecoder().decode(status.stdout)
    this.loggs.onlylog("", `\n\t${msg.split("\n").join("\n\t")}`)
    if (status.success) {
      const act_name = msg.match(/stream name: ([^ \r\n]+)\s/)
      if (act_name){
        this.loggs.onlylog("", `\twab`)
        this.loggs.log(blue("create"), `${act_name[1]}.wav`)
        this.loggs.set_info(new PathLike(`${act_name[1]}.wav`), url)
      } else {
        this.loggs.onlylog("", `\twab`)
        this.loggs.log(blue("create"), `${file_p.stem}.wav`)
        this.loggs.set_info(new PathLike(`${file_p.stem}.wav`), url)
      }
      await Deno.remove(file_path)
    } else {
      this.loggs.onlylog("", `\t acb/awb (vgmstresm faild)`)
      this.loggs.log(blue("create"), file_p.name)
    }
  }

}


class Logs {
  logs: Array<string>;
  failed: Array<{mimeType: string, comment:string, text:string, encoding:string|undefined, entry_index: number}>;
  file_infos: Array<{file_type:string, name:string, url:string, from:string, to:string}>;

  constructor() {
    this.logs = []
    this.failed = []
    this.file_infos = []
  }

  log (title:string, text:string) {
    const message = (title != "") ? `[${title}] ${text}` : text
    console.log(message)
    this.logs.push("\t"+message.replaceAll(/\x1b\[\d\dm/g, ""))
  }

  onlylog (title:string, text:string) {
    const message = (title != "") ? `[${title}] ${text}` : text
    this.logs.push(message.replaceAll(/\x1b\[\d\dm/g, ""))
  }

  set_info (file_p:PathLike, url:string, is_skipped?: true){
    const from = is_skipped ? "SKIPPED" : ""
    this.file_infos.push({
      file_type: file_p.suffix.slice(1), name: file_p.name, url, from, to:""
    })
  }

  handleError(
    comment:string,
    mimeType: string,
    text: string,
    encoding: string | undefined,
    entry_index: number,
  ){
    console.error(comment)
    this.failed.push({
      mimeType,
      comment: comment.split(":")[0],
      text,
      encoding,
      entry_index
    })
  }
}