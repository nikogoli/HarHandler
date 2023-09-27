// /^(\d{4})(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/
type dateTimePattern = string


export type LogType = {
  version: string,
  creator: CreatorType,
  browser?: BrowserType,
  pages?: Array<PageType>,
  entries: Array<EntryType>,
  comment?: string,
}
  

type CreatorType = {
  name: string,
  version: string,
  comment?: string,
}


type BrowserType = {
  name: string,
  version: string,
  comment?: string,
}


type PageType = {
  startedDateTime: dateTimePattern,
  id: string,
  title: string,
  pageTimings: PageTimingsType,
  comment?:string,
}


type PageTimingsType = {
  onContentLoad?: number
  onLoad?: number
  comment?: string
}

type EntryType = {
  startedDateTime: dateTimePattern,
  pageref?: string,
  time: number,
  request : RequestType,
  response : HARResponseType,
  cache : CatchType,
  timings : TimingsType,
  serverIPAddress? : string,
  connection? : string,
  comment?: string,
  _resourceType?: string,
}


type RequestType = {
  method: string,
  url: string,
  httpVersion: string,
  cookies : Array<CookieType>,
  headers : Array<RecordType>,
  queryString : Array<RecordType>,
  postData : PostDataType,
  headersSize : number,
  bodySize : number,
  comment?: string,
}


type RecordType = {
  name: string,
  value: string,
  comment?: string,
}


type HARResponseType = {
  status: number,
  statusText: string,
  httpVersion: string,
  cookies : Array<CookieType>,
  headers : Array<RecordType>,
  content : ContentType,
  redirectURL : string,
  headersSize : number,
  bodySize : number,
  comment?: string,
}


type CookieType = {
  name:string,
  value: string,
  path?: string,
  domain?: string,
  expires?: string,
  httpOnly?: boolean,
  secure? : boolean,
  comment?: string,
}


type PostDataType = {
  mimeType: string,
  text?: string,
  params?: Array<{
    name: string,
    value?: string,
    fileName?: string,
    contentType?: string,
    comment?: string,
  }>,
  comment?: string
}
 

type ContentType = {
  size: number,
  compression?: number,
  mimeType: string,
  text?: string,
  encoding?: string,
  comment?: string,
}
  

type CatchType = {
  beforeRequest: CacheEntryType,
  afterRequest: CacheEntryType,
  comment?: string
}


type CacheEntryType = {
  expires?: string,
  lastAccess: string,
  eTag: string,
  hitCount: number,
  comment?: string,
}


type TimingsType = {
  dns?: number,
  connect?: number,
  blocked?: number,
  send: number,
  wait: number,
  receive: number,
  ssl?: number,
  comment?: string,
}


export type FileInfo = {
  file_type:string,
  name:string,
  url:string,
  from:string,
  to:string
}


export type FileList = { list: Array<FileInfo> }