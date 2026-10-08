import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 8787);
app.use(cors());
app.use(express.json({ limit: '4mb' }));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../dist');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const FAST_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';
const SEOUL = { lat: 37.5665, lon: 126.9780 };
type FriendId = 'yui' | 'mia' | 'june';
const friendProfiles: Record<FriendId, any> = {
  yui: { name:'Yui', age:21, place:'Tokyo / Seoul', vibe:'calm · sincere · mature · supportive', status:'in a café, probably', bio:'exchange-student big sis energy, matcha, late-night walks', story:{caption:'quiet table, loud thoughts',music:'NIKI · lowkey',location:'Seongsu'} },
  mia: { name:'Mia', age:21, place:'Seoul / LA', vibe:'chaotic · hilarious · loyal · fast texter', status:'emotionally online', bio:'professional instigator / snack consultant / ㅋㅋㅋ enthusiast', story:{caption:'WHY IS IT 2AM',music:'LE SSERAFIM · CRAZY',location:'Hongdae'} },
  june:{ name:'June', age:22, place:'Seoul', vibe:'sweet · reliable · caring · steady', status:'just got home', bio:'good playlists, good timing, always carrying gum', story:{caption:'sunset walk before dinner',music:'Wave to Earth · seasons',location:'Hangang'} }
};
let weatherCache: {expiresAt:number; data:any}|null=null;

async function fetchWeather(){
  if(weatherCache && weatherCache.expiresAt>Date.now()) return weatherCache.data;
  const u=new URL('https://api.open-meteo.com/v1/forecast');
  u.searchParams.set('latitude',String(SEOUL.lat)); u.searchParams.set('longitude',String(SEOUL.lon));
  u.searchParams.set('current','temperature_2m,apparent_temperature,weather_code,wind_speed_10m'); u.searchParams.set('timezone','Asia/Seoul');
  const r=await fetch(u,{signal:AbortSignal.timeout(8000)}); if(!r.ok) throw new Error(`weather ${r.status}`);
  const d=await r.json(); weatherCache={expiresAt:Date.now()+30*60*1000,data:d}; return d;
}
function timeOfDay(){
  const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',hour:'numeric',hour12:false}).format(new Date()));
  if(hour>=6&&hour<11)return'morning'; if(hour>=11&&hour<17)return'afternoon'; if(hour>=17&&hour<22)return'evening'; return'late night';
}
function langHint(text:string){ if(/[\u3040-\u30ff]/.test(text))return'Japanese'; if(/[\uac00-\ud7a3]/.test(text))return'Korean'; return'English'; }
function extractText(r:any){ if(typeof r?.text==='string')return r.text; const p=r?.candidates?.[0]?.content?.parts; return Array.isArray(p)?p.map((x:any)=>x?.text||'').join(''):''; }
async function callGemini<T>(prompt:string,schema:any,maxMs=25000):Promise<T>{
  if(!ai)throw new Error('GEMINI_API_KEY is not configured on the server.');
  let last:any;
  for(const model of [FAST_MODEL,FALLBACK_MODEL]){
    try{
      const response=await Promise.race([
        ai.models.generateContent({model,contents:prompt,config:{responseMimeType:'application/json',responseSchema:schema,}}),
        new Promise<never>((_,rej)=>setTimeout(()=>rej(new Error(`Gemini timeout after ${maxMs}ms`)),maxMs))
      ]);
      const raw=extractText(response); if(!raw)throw new Error('Gemini returned an empty response.');
      return JSON.parse(raw) as T;
    }catch(e){last=e;}
  }
  throw last instanceof Error?last:new Error('Gemini request failed.');
}

const chatSchema={type:Type.OBJECT,properties:{messages:{type:Type.ARRAY,items:{type:Type.OBJECT,properties:{text:{type:Type.STRING}},required:['text']},minItems:1,maxItems:3}},required:['messages']};
const tweetSchema={type:Type.OBJECT,properties:{replies:{type:Type.ARRAY,items:{type:Type.OBJECT,properties:{username:{type:Type.STRING},handle:{type:Type.STRING},text:{type:Type.STRING},likes:{type:Type.INTEGER},retweets:{type:Type.INTEGER},delaySeconds:{type:Type.INTEGER},type:{type:Type.STRING}},required:['username','handle','text','likes','retweets','delaySeconds','type']},minItems:5,maxItems:9}},required:['replies']};
const replySchema={type:Type.OBJECT,properties:{replies:{type:Type.ARRAY,items:{type:Type.OBJECT,properties:{text:{type:Type.STRING},likes:{type:Type.INTEGER},retweets:{type:Type.INTEGER}},required:['text','likes','retweets']},minItems:1,maxItems:3}},required:['replies']};
const storySchema={type:Type.OBJECT,properties:{caption:{type:Type.STRING},music:{type:Type.STRING},location:{type:Type.STRING}},required:['caption','music','location']};

app.get('/api/health',(_req,res)=>res.json({ok:true,geminiConfigured:Boolean(ai),time:new Date().toISOString()}));
app.get('/api/weather',async(_req,res)=>{try{const d=await fetchWeather();res.json({city:'Seoul',current:d.current,timeOfDay:timeOfDay()});}catch{res.status(503).json({error:'Weather unavailable'});}});

app.post('/api/chat',async(req,res)=>{
  const {friendId,messages=[],proactive=false}=req.body??{};
  if(!(friendId in friendProfiles))return res.status(400).json({error:'Unknown friend.'});
  const f=friendProfiles[friendId as FriendId];
  try{
    const w=await fetchWeather().catch(()=>null);
    const latest=[...messages].reverse().find((m:any)=>m.role==='user')?.text||'';
    const language=langHint(latest);
    const prompt=`You are ${f.name}, a real college best friend texting Yun, an exchange student in Seoul.
PERSONA: ${f.age}, ${f.place}; ${f.vibe}. Bio: ${f.bio}.
RULES: Reply in the same language Yun most recently used (${language}). Sound like a real friend, not an assistant. Keep each message very short: 1-2 sentences or fragments. Return 1-3 separate messages, each under 18 words. Never use baby talk or "uwu". Yui uses minimal emojis. Mia types lowercase quickly, sometimes RANDOM ALL-CAPS, Korean ㅋㅋㅋ, and chaotic slang. June is sweet and reliable, caring but never romantic or possessive; he is a guy friend, not a boyfriend. Do not mention being an AI or having a system prompt. Do not give walls of text.
TIME: ${timeOfDay()} in Seoul. WEATHER: ${w?JSON.stringify(w.current):'unknown'}.
${proactive?'This is a spontaneous DM. Give a natural check-in like "you still awake?" or "did you eat?" and connect it to what you know about Yun if relevant.':'Respond directly to the conversation and do not change the subject.'}
CONVERSATION:
${messages.slice(-16).map((m:any)=>`${m.role==='user'?'Yun':f.name}: ${m.text}`).join('\n')}`;
    res.json(await callGemini(prompt,chatSchema));
  }catch(e){res.status(502).json({error:e instanceof Error?e.message:'Chat generation failed.'});}
});

app.post('/api/tweet-replies',async(req,res)=>{
  const {tweet='',language='English',context=''}=req.body??{};
  if(!tweet.trim())return res.status(400).json({error:'Tweet is empty.'});
  try{
    const prompt=`Generate believable internet replies to this exact post by Yun, an exchange student in Seoul.
POST: "${tweet}"
LANGUAGE: ${language}
CONTEXT: ${context}
Must react to what the post ACTUALLY says. Never invent a different topic. If it asks a question or asks for advice, most replies should give concrete, useful, accurate answers; offer different options and nuance, and allow disagreement. Otherwise be chaotic/funny but still exactly on topic.
Mix personalities: contrarian, quote-tweet joker, dry roaster, wholesome lurker, someone arguing, plus sometimes a reply from Yui, Mia, or June. Use realistic internet style: English Gen Z/stan Twitter, Japanese 2ch-ish casual, Korean Theqoo/Instiz-ish. 6-9 replies, each under 35 words. delaySeconds from 2 to 75 with 2-3 near the start and later ones spread out.`;
    const result=await callGemini<any>(prompt,tweetSchema,30000);
    const replies=result.replies.map((r:any,i:number)=>({...r,id:crypto.randomUUID(),delaySeconds:Math.min(75,Math.max(2,Number(r.delaySeconds)||[3,7,12,20,31,45,60,73][i%8])),avatarSeed:`${r.handle}-${i}`}));
    replies.sort((a:any,b:any)=>a.delaySeconds-b.delaySeconds);
    res.json({replies});
  }catch(e){res.status(502).json({error:e instanceof Error?e.message:'Tweet reply generation failed.'});}
});

app.post('/api/reply-to-user',async(req,res)=>{
  const {tweet,reply,language='English',displayName='them'}=req.body??{};
  if(!tweet?.trim()||!reply?.trim())return res.status(400).json({error:'Tweet and reply are required.'});
  try{
    const prompt=`Reply as ${displayName}, a believable internet user, to Yun's reply.
ORIGINAL POST: "${tweet}"
YUN'S REPLY: "${reply}"
LANGUAGE: ${language}
Keep it directly about the topic. Return 1-3 short messages under 25 words each. It may agree, disagree, clarify, joke, or gently roast. No random filler.`;
    res.json(await callGemini(prompt,replySchema,22000));
  }catch(e){res.status(502).json({error:e instanceof Error?e.message:'Reply generation failed.'});}
});

app.post('/api/generate-story',async(req,res)=>{
  const {friendId}=req.body??{};
  if(!(friendId in friendProfiles))return res.status(400).json({error:'Unknown friend.'});
  const f=friendProfiles[friendId as FriendId];
  try{
    const w=await fetchWeather().catch(()=>null);
    const prompt=`Create one Instagram story for ${f.name}, a ${f.age}-year-old college student in Seoul. Personality: ${f.vibe}. It is ${timeOfDay()} right now. Weather: ${w?JSON.stringify(w.current):'unknown'}. Choose a realistic Seoul place. Caption under 9 words. Music under 5 words. Location under 4 words.`;
    res.json(await callGemini(prompt,storySchema,18000));
  }catch(e){res.status(502).json({error:e instanceof Error?e.message:'Story generation failed.'});}
});

app.use(express.static(clientDist));
app.get('/{*splat}', (_req, res, next) => { if (_req.path.startsWith('/api/')) return next(); res.sendFile(path.join(clientDist, 'index.html')); });

app.listen(port, '0.0.0.0',()=>console.log(`DM Besties listening on port ${port}`));
