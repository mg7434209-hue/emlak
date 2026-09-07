const fs=require('fs'), path=require('path'), http=require('http');
const ROOT=__dirname, DATA_DIR=process.env.DATA_DIR||path.join(ROOT,'data'), STORE=path.join(DATA_DIR,'site-stats.json');
function load(){try{return JSON.parse(fs.readFileSync(STORE,'utf8'))}catch(e){return {total:0,today:0,date:new Date().toISOString().slice(0,10),seen:{}}}}
let S=load();
function save(){fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(STORE+'.tmp',JSON.stringify(S));fs.renameSync(STORE+'.tmp',STORE)}
function touch(ip){const d=new Date().toISOString().slice(0,10);if(S.date!==d){S.date=d;S.today=0;S.seen={}};const k=String(ip||'?');if(!S.seen[k]){S.seen[k]=Date.now();S.total++;S.today++;save()}}
const original=http.createServer;
http.createServer=function(handler){
  return original.call(http,function(req,res){
    const url=new URL(req.url,'http://localhost');
    const accept=String(req.headers.accept||'');
    if(url.pathname==='/api/site-stats' && req.method==='GET'){
      const body=JSON.stringify({total:S.total||0,today:S.today||0});
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(body);
    }
    const isPage=req.method==='GET' && accept.includes('text/html') && !url.pathname.startsWith('/api/');
    if(isPage) touch((String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.socket.remoteAddress));
    return handler(req,res);
  });
};
require('./server.js');
