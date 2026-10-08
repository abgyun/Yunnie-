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
const tweetBatchSchema={type:Type.OBJECT,properties:{replies:{type:Type.ARRAY,items:{type:Type.OBJECT,properties:{username:{type:Type.STRING},handle:{type:Type.STRING},text:{type:Type.STRING},likes:{type:Type.INTEGER},retweets:{type:Type.INTEGER},type:{type:Type.STRING},replyToHandle:{type:Type.STRING}},required:['username','handle','text','likes','retweets','type','replyToHandle']},minItems:8,maxItems:8}},required:['replies']};
const replySchema={type:Type.OBJECT,properties:{replies:{type:Type.ARRAY,items:{type:Type.OBJECT,properties:{text:{type:Type.STRING},likes:{type:Type.INTEGER},retweets:{type:Type.INTEGER}},required:['text','likes','retweets']},minItems:1,maxItems:3}},required:['replies']};
const imageAnalysisSchema={type:Type.OBJECT,properties:{description:{type:Type.STRING},setting:{type:Type.STRING},people:{type:Type.STRING},objects:{type:Type.STRING},textInImage:{type:Type.STRING},mood:{type:Type.STRING}},required:['description','setting','people','objects','textInImage','mood']};
const storySchema={type:Type.OBJECT,properties:{caption:{type:Type.STRING},music:{type:Type.STRING},location:{type:Type.STRING},comments:{type:Type.ARRAY,items:{type:Type.STRING},minItems:2,maxItems:4}},required:['caption','music','location','comments']};

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
RULES: Reply in the same language Yun most recently used (${language}). Sound like a real friend, not an assistant. Keep each message very short: 1-2 sentences or fragments. Return 1-3 separate messages, each under 18 words. Sound like a real friend texting, including current internet expressions only when natural. Never use baby talk or "uwu". Use natural Gen Z / internet language when it fits, but do not force slang into every message. ㅋㅋㅋ/ㅋㅋ are occasional, not a catchphrase. Yui uses minimal emojis. Mia types lowercase quickly, sometimes RANDOM ALL-CAPS, English Gen Z slang and Korean internet slang; she does not spam ㅋㅋㅋ. June is sweet and reliable, caring but never romantic or possessive; he is a guy friend, not a boyfriend. Do not mention being an AI or having a system prompt. Do not give walls of text.
TIME: ${timeOfDay()} in Seoul. WEATHER: ${w?JSON.stringify(w.current):'unknown'}.
${proactive?'This is a spontaneous DM. Give a natural check-in like "you still awake?" or "did you eat?" and connect it to what you know about Yun if relevant.':'Respond directly to the conversation and do not change the subject.'}
CONVERSATION:
${messages.slice(-16).map((m:any)=>`${m.role==='user'?'Yun':f.name}: ${m.text}`).join('\n')}`;
    res.json(await callGemini(prompt,chatSchema));
  }catch(e){res.status(502).json({error:e instanceof Error?e.message:'Chat generation failed.'});}
});

async function analyzeTweetImage(imageData:string):Promise<any|null>{
  if(!ai||!imageData)return null;
  const match=imageData.match(/^data:([^;]+);base64,(.+)$/s);
  if(!match)return null;
  try{
    const mimeType=match[1];
    const data=match[2];
    const prompt='Analyze this user-posted image for an X/Twitter thread. Describe only what is visibly present. Note setting, people, objects, visible text, and overall mood. Be concrete enough that replies can reference the actual image. Do not invent details.';
    const response=await Promise.race([
      ai.models.generateContent({
        model:FAST_MODEL,
        contents:[{inlineData:{mimeType,data}},{text:prompt}],
        config:{responseMimeType:'application/json',responseSchema:imageAnalysisSchema}
      }),
      new Promise<never>((_,rej)=>setTimeout(()=>rej(new Error('Image analysis timed out')),25000))
    ]);
    const raw=extractText(response);
    return raw?JSON.parse(raw):null;
  }catch(e){
    console.error('Tweet image analysis failed:',e instanceof Error?e.message:e);
    return null;
  }
}

app.post('/api/tweet-replies',async(req,res)=>{
  const {tweet='',language='English',imageData='',context=''}=req.body??{};
  if(!tweet.trim()&&!imageData)return res.status(400).json({error:'Tweet or image is required.'});
  try{
    const basePrompt='Generate believable internet replies to this exact X/Twitter post by Yun, an exchange student in Seoul.\nPOST: "'+tweet+'"\nLANGUAGE: '+language+'\nCONTEXT: '+context+'\nReact to the exact post and, when an IMAGE ANALYSIS block is present, react to visible details from the actual photo. Never invent a different topic or visual detail. Mix genuine answers, disagreement, criticism, annoyed reactions, jokes, nitpicks, quote-tweet energy, and real back-and-forth arguments. For Japanese posts use natural X/2ch-adjacent Japanese; for English use current internet/Gen-Z language; for Korean use natural Korean internet speech. This batch must contain exactly 8 different users. 2-4 of them should be part of a believable argument or レスバ. Reply-to handles must reference users from this same batch. Keep every reply under 35 words. Do not make every reply supportive.';
    const batches=await Promise.all(Array.from({length:4},(_,i)=>callGemini<any>(basePrompt+'\nBATCH '+(i+1)+'/4: create 8 unique users with a different mix of reactions.',tweetBatchSchema,30000)));
    const replies=batches.flatMap((b:any)=>Array.isArray(b.replies)?b.replies:[]).slice(0,32).map((r:any,i:number)=>({...r,id:crypto.randomUUID(),delaySeconds:0,avatarSeed:(r.handle||'user')+'-'+i,replyToHandle:r.replyToHandle||''}));
    if(replies.length<30)throw new Error('Only generated '+replies.length+' replies.');
    res.json({replies});
  }catch(e){
    console.error('Tweet reply generation failed:',e);
    res.status(502).json({error:e instanceof Error?e.message:'Tweet reply generation failed.'});
  }
});
app.post('/api/reply-to-user',async(req,res)=>{
  const {tweet,reply,language='English',displayName='them'}=req.body??{};
  if(!tweet?.trim()||!reply?.trim())return res.status(400).json({error:'Tweet and reply are required.'});
  try{
    const prompt=`Reply as ${displayName}, a believable internet user, to Yun's reply.
ORIGINAL POST: "${tweet}"
YUN'S REPLY: "${reply}"
LANGUAGE: ${language}
Keep it directly about the exact point being argued. Return 1-3 short messages under 25 words each. This can agree, disagree, quote a detail, get annoyed, nitpick, or escalate a believable レスバ. Use natural internet speech for the tweet language. No random filler.`;
    res.json(await callGemini(prompt,replySchema,22000));
  }catch(e){res.status(502).json({error:e instanceof Error?e.message:'Reply generation failed.'});}
});

async function generateStoryImage(prompt:string){
  if(!ai)return null;
  try{
    const response=await Promise.race([
      ai.models.generateContent({model:'gemini-nano-banana-2.1',contents:prompt,config:{responseModalities:['IMAGE']}}),
      new Promise<never>((_,rej)=>setTimeout(()=>rej(new Error('Story image generation timed out')),35000))
    ]);
    const parts=response?.candidates?.[0]?.content?.parts||[];
    const img=parts.find((p:any)=>p?.inlineData?.data);
    if(!img?.inlineData?.data)return null;
    return 'data:'+(img.inlineData.mimeType||'image/png')+';base64,'+img.inlineData.data;
  }catch(e){
    console.error('Story image generation failed:',e instanceof Error?e.message:e);
    return null;
  }
}
const STORY_VARIANTS:Record<FriendId,Array<{caption:string;music:string;location:string;query:string}>>={
  yui:[
    {caption:'tiny café, huge main-character energy',music:'NIKI · lowkey',location:'Seongsu',query:'seongsu,seoul,cafe'},
    {caption:'studying here was a very good decision',music:'Laufey · From The Start',location:'Yeonnam',query:'yeonnam,seoul,cafe'},
    {caption:'the kind of evening I needed',music:'Wave to Earth · seasons',location:'Euljiro',query:'euljiro,seoul,street'},
    {caption:'one more tea before heading home',music:'HONNE · no song without you',location:'Hannam',query:'hannam,seoul,tea'}
  ],
  mia:[
    {caption:'this city is SO unserious',music:'LE SSERAFIM · CRAZY',location:'Hongdae',query:'hongdae,seoul,night'},
    {caption:'I left the house for this btw',music:'aespa · Drama',location:'Hannam',query:'hannam,seoul,street'},
    {caption:'the fit deserved a photo',music:'NewJeans · Super Shy',location:'Seongsu',query:'seongsu,seoul,fashion'},
    {caption:'why did we end up here again',music:'DAY6 · Happy',location:'Euljiro',query:'euljiro,seoul,night'}
  ],
  june:[
    {caption:'walked until the air felt better',music:'Wave to Earth · seasons',location:'Hangang',query:'hangang,seoul,sunset'},
    {caption:'quiet view before dinner',music:'Laufey · From The Start',location:'Seoul Forest',query:'seoul,forest,sunset'},
    {caption:'found a good spot to reset',music:'HONNE · warm on a cold night',location:'Nodeul',query:'nodeul,seoul,river'},
    {caption:'home a little later than planned',music:'Day6 · You Were Beautiful',location:'Itaewon',query:'itaewon,seoul,street'}
  ]
};

app.post('/api/generate-story',async(req,res)=>{
  const {friendId,variation=1}=req.body??{};
  if(!(friendId in friendProfiles))return res.status(400).json({error:'Unknown friend.'});
  const f=friendProfiles[friendId as FriendId];
  const list=STORY_VARIANTS[friendId as FriendId];
  const base=list[Math.abs(Number(variation)||1)%list.length];
  const fallbackComments=f.id==='yui'?['this feels so you','saving this vibe']:f.id==='mia'?['girl where are you','the fit ate']:['that view is insane','get home safe'];
  try{
    const w=await fetchWeather().catch(()=>null);
    const context=w?.current?('Current Seoul weather: '+w.current.temperature_2m+'°C, code '+w.current.weather_code+'.'):'Current Seoul weather unavailable.';
    const metaPrompt='Create one fresh Instagram Story for '+f.name+', age '+f.age+', a college student in Seoul. Personality: '+f.vibe+'. Time: '+timeOfDay()+'. '+context+' Variation #'+variation+'. Return concise JSON with caption, music, location, and 2-4 short realistic Story replies/comments. Make all details match the photo scene.';
    const generated=ai?await callGemini<any>(metaPrompt,storySchema,20000).catch(e=>{console.error('Story metadata failed:',e);return null;}):null;
    const imagePrompt='Generate a photorealistic vertical 9:16 Instagram Story photo, like an authentic smartphone photo taken by a 21-22 year old college student in Seoul. NOT illustration, NOT anime, NOT 3D render, NOT digital art. Natural imperfect smartphone photography, realistic lighting, realistic materials, subtle camera grain, believable Seoul location. Personality: '+f.vibe+'. Scene: '+base.query+'. Caption mood: '+(generated?.caption||base.caption)+'. Location: '+(generated?.location||base.location)+'. Time: '+timeOfDay()+'. '+context+' Do not put text, captions, logos, watermarks, or UI elements in the image.';
    const imageUrl=await generateStoryImage(imagePrompt);
    res.json({caption:generated?.caption||base.caption,music:generated?.music||base.music,location:generated?.location||base.location,comments:Array.isArray(generated?.comments)&&generated.comments.length?generated.comments:fallbackComments,imageUrl,imageAlt:'AI-generated photorealistic Instagram Story photo',revision:Number(variation)||1});
  }catch(e){
    console.error('Story generation failed:',e);
    res.json({caption:base.caption,music:base.music,location:base.location,comments:fallbackComments,imageUrl:null,imageAlt:'',revision:Number(variation)||1});
  }
});
app.use(express.static(clientDist));
app.get('/{*splat}', (_req, res, next) => { if (_req.path.startsWith('/api/')) return next(); res.sendFile(path.join(clientDist, 'index.html')); });

app.listen(port, '0.0.0.0',()=>console.log(`DM Besties listening on port ${port}`));
