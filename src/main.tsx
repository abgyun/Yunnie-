import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  ArrowUp, AudioLines, Bookmark, Camera, CheckCheck, ChevronLeft, Heart, Image as ImageIcon, Info, Instagram,
  Mic, MoreHorizontal, Phone, Play, Plus, Reply, Send, Settings2, Smile, Sparkles, Sun, Volume2, VolumeX,
  Video, X, MessageCircle, Repeat2, ExternalLink, Clock3, MapPin, Music2, CloudSun, Flame
} from 'lucide-react';
import './styles.css';

type FriendId = 'yui'|'mia'|'june';
type Message = { id:string; role:'user'|'friend'; text?:string; image?:string; audio?:string; ts:number; seen?:boolean; reactions?:string[] };
type TweetReply = { id:string; username:string; handle:string; text:string; likes:number; retweets:number; delaySeconds:number; type:string; avatarSeed?:string; visibleAt?:number; replyToHandle?:string };
type Tweet = { id:string; text:string; image?:string; ts:number; likes:number; retweets:number; bookmarks:number; liked?:boolean; retweeted?:boolean; bookmarked?:boolean; replies:TweetReply[]; pending?:TweetReply[]; postedLanguage:string };

type Story = {caption:string;music:string;location:string;theme:string;imageUrl?:string;imageAlt?:string;revision?:number;comments?:string[]};
type Friend = {id:FriendId;name:string;age:number;place:string;vibe:string;status:string;bio:string;handle:string;avatar:string;story: Story};

const FRIENDS:Record<FriendId,Friend> = {
  yui:{id:'yui',name:'Yui',age:21,place:'Tokyo / Seoul',vibe:'calm · sincere · mature · supportive',status:'in a café, probably',bio:'exchange-student big sis energy, matcha, late-night walks',handle:'@yui.note',avatar:'/avatars/yui.svg',story:{caption:'quiet table, loud thoughts',music:'NIKI · lowkey',location:'Seongsu',theme:'from-rose-100 via-white to-violet-100',imageUrl:'https://loremflickr.com/720/1120/seoul,cafe?lock=101',imageAlt:'Seoul cafe'}},
  mia:{id:'mia',name:'Mia',age:21,place:'Seoul / LA',vibe:'chaotic · hilarious · loyal · fast texter',status:'emotionally online',bio:'professional instigator / snack consultant / ㅋㅋㅋ enthusiast',handle:'@miamakesnoise',avatar:'/avatars/mia.svg',story:{caption:'WHY IS IT 2AM',music:'LE SSERAFIM · CRAZY',location:'Hongdae',theme:'from-fuchsia-100 via-orange-50 to-yellow-100',imageUrl:'https://loremflickr.com/720/1120/hongdae,seoul,night?lock=201',imageAlt:'Hongdae at night'}},
  june:{id:'june',name:'June',age:22,place:'Seoul',vibe:'sweet · reliable · caring · steady',status:'just got home',bio:'good playlists, good timing, always carrying gum',handle:'@juneseoul',avatar:'/avatars/june.svg',story:{caption:'sunset walk before dinner',music:'Wave to Earth · seasons',location:'Hangang',theme:'from-sky-100 via-amber-50 to-orange-100',imageUrl:'https://loremflickr.com/720/1120/hangang,seoul,sunset?lock=301',imageAlt:'Hangang sunset'}}
};

const seedChats:Record<FriendId,Message[]> = {
  yui:[{id:'yui-1',role:'friend',text:'you survived another class day ☕️',ts:Date.now()-1000*60*34,seen:true},{id:'yui-2',role:'user',text:'barely lol',ts:Date.now()-1000*60*31,seen:true},{id:'yui-3',role:'friend',text:'then tea + a shower. non-negotiable',ts:Date.now()-1000*60*30,seen:true}],
  mia:[{id:'mia-1',role:'friend',text:'ok wait why does your life sound like a kdrama today',ts:Date.now()-1000*60*47,seen:true},{id:'mia-2',role:'user',text:'HAHA what did i do',ts:Date.now()-1000*60*43,seen:true},{id:'mia-3',role:'friend',text:'you literally went from class to pop-up to concert planning ㅋㅋㅋ',ts:Date.now()-1000*60*42,seen:true}],
  june:[{id:'june-1',role:'friend',text:'did you eat anything after class?',ts:Date.now()-1000*60*22,seen:true},{id:'june-2',role:'user',text:'i had bread and coffee',ts:Date.now()-1000*60*18,seen:true},{id:'june-3',role:'friend',text:'that does not count as dinner 😭',ts:Date.now()-1000*60*17,seen:true}]
};

const STORY_BY_TIME = (name:string) => {
  const hour=new Date().getHours();
  if(hour<11)return name==='Mia'?['iced americano + bad decisions','NewJeans · Super Shy','Yeonnam']:[name==='Yui'?'morning pages + matcha':'slow morning walk',name==='Yui'?'IU · strawberry moon':'Laufey · From The Start','Seoul Forest'];
  if(hour<17)return name==='Mia'?['lunch break became a 3pm break','aespa · Drama','Hannam']:[name==='Yui'?'tiny table, big afternoon':'between errands','NIKI · lowkey','Seongsu'];
  if(hour<22)return name==='Mia'?['the city is LOUD tonight','LE SSERAFIM · CRAZY','Hongdae']:[name==='Yui'?'sunset + one more page':'sunset before dinner','Wave to Earth · seasons','Hangang'];
  return name==='Mia'?['WHY ARE WE STILL AWAKE','DAY6 · Happy','Euljiro']:[name==='Yui'?'late tea, no rush':'home safe','HONNE · no song without you','Yeonnam'];
};

function storyPhoto(scene:'cafe'|'city'|'fashion'|'river',seed:number){
  const palettes:{[key:string]:string[]}={
    cafe:['#f9e7d0','#8b5e4a','#f6f0e8'],
    city:['#17152f','#f06aa7','#6b7cff'],
    fashion:['#efe1d0','#24202b','#d98aa5'],
    river:['#f7b56b','#6b8fdc','#172d58']
  };
  const [sky,accent,shadow]=palettes[scene];
  const safe=(seed%997)+1;
  let extras='';
  if(scene==='cafe') extras='<rect x="110" y="660" width="580" height="270" rx="34" fill="'+shadow+'"/><circle cx="400" cy="720" r="90" fill="'+accent+'"/><rect x="335" y="770" width="130" height="120" rx="28" fill="'+accent+'"/>';
  if(scene==='city') extras='<rect x="80" y="520" width="170" height="450" fill="'+shadow+'"/><rect x="270" y="430" width="220" height="540" fill="#292648"/><rect x="515" y="350" width="180" height="620" fill="'+shadow+'"/>';
  if(scene==='fashion') extras='<rect x="120" y="120" width="560" height="840" rx="30" fill="#ffffff28" stroke="#ffffff70" stroke-width="8"/><circle cx="400" cy="360" r="72" fill="#d7a27f"/><path d="M315 450 Q400 400 485 450 L540 760 Q400 825 260 760 Z" fill="'+accent+'"/>';
  if(scene==='river') extras='<path d="M0 520 Q180 420 360 520 T800 500 V1200 H0Z" fill="'+accent+'"/><path d="M0 760 Q200 690 400 780 T800 760 V1200 H0Z" fill="'+shadow+'"/><path d="M120 610 Q400 540 680 620" stroke="#ffffffaa" stroke-width="12" fill="none"/>';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+sky+'"/><stop offset=".62" stop-color="'+accent+'"/><stop offset="1" stop-color="'+shadow+'"/></linearGradient><filter id="grain"><feTurbulence baseFrequency=".8" numOctaves="2" seed="'+safe+'" type="fractalNoise"/><feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer></filter></defs><rect width="800" height="1200" fill="url(#g)"/><circle cx="650" cy="190" r="170" fill="#ffffff22"/>'+extras+'<rect width="800" height="1200" filter="url(#grain)" opacity=".45"/></svg>';
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}

const FRONTEND_STORY_VARIANTS:Record<FriendId,Story[]> = {
  yui:[
    {caption:'tiny café, huge main-character energy',music:'NIKI · lowkey',location:'Seongsu',theme:'from-rose-100 via-white to-violet-100',imageUrl:storyPhoto('cafe',1),imageAlt:'generated café photo',comments:["this place is very Yui","need this café saved immediately"]},
    {caption:'studying here was a very good decision',music:'Laufey · From The Start',location:'Yeonnam',theme:'from-rose-100 via-white to-violet-100',imageUrl:storyPhoto('cafe',2),imageAlt:'generated café table photo',comments:["okay this looks so peaceful","the lighting???"]},
    {caption:'the kind of evening I needed',music:'Wave to Earth · seasons',location:'Euljiro',theme:'from-rose-100 via-white to-violet-100',imageUrl:storyPhoto('city',3),imageAlt:'generated Seoul evening photo',comments:["this is such a Seoul evening","you always find the prettiest spots"]},
    {caption:'one more tea before heading home',music:'HONNE · no song without you',location:'Hannam',theme:'from-rose-100 via-white to-violet-100',imageUrl:storyPhoto('cafe',4),imageAlt:'generated tea photo',comments:["one more tea is valid","text me when you are home"]}
  ],
  mia:[
    {caption:'this city is SO unserious',music:'LE SSERAFIM · CRAZY',location:'Hongdae',theme:'from-fuchsia-100 via-orange-50 to-yellow-100',imageUrl:storyPhoto('city',5),imageAlt:'generated night city photo',comments:["HELP why is this actually iconic","girl where are you"]},
    {caption:'I left the house for this btw',music:'aespa · Drama',location:'Hannam',theme:'from-fuchsia-100 via-orange-50 to-yellow-100',imageUrl:storyPhoto('fashion',6),imageAlt:'generated fashion photo',comments:["the fit ate","post the full fit RIGHT NOW"]},
    {caption:'the fit deserved a photo',music:'NewJeans · Super Shy',location:'Seongsu',theme:'from-fuchsia-100 via-orange-50 to-yellow-100',imageUrl:storyPhoto('fashion',7),imageAlt:'generated street fashion photo',comments:["okayyy I see you","this outfit is doing numbers"]},
    {caption:'why did we end up here again',music:'DAY6 · Happy',location:'Euljiro',theme:'from-fuchsia-100 via-orange-50 to-yellow-100',imageUrl:storyPhoto('city',8),imageAlt:'generated city lights photo',comments:["why does this look like a music video","you cannot keep finding places like this"]}
  ],
  june:[
    {caption:'walked until the air felt better',music:'Wave to Earth · seasons',location:'Hangang',theme:'from-sky-100 via-amber-50 to-orange-100',imageUrl:storyPhoto('river',9),imageAlt:'generated river sunset photo',comments:["that view is insane","perfect walk weather"]},
    {caption:'quiet view before dinner',music:'Laufey · From The Start',location:'Seoul Forest',theme:'from-sky-100 via-amber-50 to-orange-100',imageUrl:storyPhoto('river',10),imageAlt:'generated park photo',comments:["this is actually so nice","glad you got some fresh air"]},
    {caption:'found a good spot to reset',music:'HONNE · warm on a cold night',location:'Nodeul',theme:'from-sky-100 via-amber-50 to-orange-100',imageUrl:storyPhoto('river',11),imageAlt:'generated river photo',comments:["okay this is peaceful","save this spot"]},
    {caption:'home a little later than planned',music:'DAY6 · You Were Beautiful',location:'Itaewon',theme:'from-sky-100 via-amber-50 to-orange-100',imageUrl:storyPhoto('city',12),imageAlt:'generated city lights photo',comments:["get home safe","that view was worth the walk"]}
  ]
};

const initialTweets:Tweet[] = [
  {id:'t1',text:'Seoul weather really cannot decide if it wants to be cozy or dramatic',ts:Date.now()-1000*60*48,likes:31,retweets:4,bookmarks:2,postedLanguage:'English',replies:[
    {id:'r1',username:'seoulsidewalk',handle:'@seoulsidewalk',text:'the wind is literally doing character development rn',likes:14,retweets:2,delaySeconds:0,type:'roaster'},
    {id:'r2',username:'유자차',handle:'@yjcha',text:'낮엔 따뜻한데 저녁엔 갑자기 추워요 ㅋㅋ 얇은 겉옷 꼭',likes:21,retweets:4,delaySeconds:0,type:'helpful'}
  ]},
  {id:'t2',text:'exchange student rule: never say no to a new café',ts:Date.now()-1000*60*195,likes:67,retweets:11,bookmarks:9,postedLanguage:'English',replies:[
    {id:'r3',username:'milkfoam',handle:'@milkfoam',text:'this is literally why my bank account is fighting me',likes:38,retweets:5,delaySeconds:0,type:'wholesome'}
  ]}
];

function load<T>(key:string,fallback:T):T { try{const x=localStorage.getItem(key); return x?JSON.parse(x):fallback;}catch{return fallback;} }
function save(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function formatTime(ts:number){return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(ts);}
function avatarColor(seed:string){const n=[...seed].reduce((a,c)=>a+c.charCodeAt(0),0);return ['#fbcfe8','#ddd6fe','#bae6fd','#fde68a','#bbf7d0','#fed7aa'][n%6];}
function languageOf(s:string){if(/[\u3040-\u30ff]/.test(s))return'Japanese';if(/[\uac00-\ud7a3]/.test(s))return'Korean';return'English';}
function weatherLabel(code:number|undefined){if(code==null)return'';if(code===0)return'Sunny';if(code<=3)return'Partly cloudy';if(code<=48)return'Cloudy';if(code<=67)return'Rainy';return'Showery';}

export default function App(){
  const [tab,setTab]=useState<'dms'|'feed'>('dms');
  const [activeFriend,setActiveFriend]=useState<FriendId>('yui');
  const [chats,setChats]=useState<Record<FriendId,Message[]>>(()=>load('dm-besties-chats',seedChats));
  const [unread,setUnread]=useState<Record<FriendId,number>>(()=>load('dm-besties-unread',{yui:0,mia:1,june:0}));
  const [input,setInput]=useState('');
  const [typing,setTyping]=useState(false);
  const [soundOn,setSoundOn]=useState(()=>load('dm-besties-sound',true));
  const [theme,setTheme]=useState('soft');
  const [profile,setProfile]=useState<FriendId|null>(null);
  const [story,setStory]=useState<FriendId|null>(null);
  const [storyCycle,setStoryCycle]=useState<Record<FriendId,number>>(()=>load('dm-besties-story-cycle',{yui:0,mia:0,june:0}));
  const [storyData,setStoryData]=useState<Record<FriendId,Story>>(()=>{const saved=load('dm-besties-stories',{} as Partial<Record<FriendId,Story>>);return (Object.keys(FRIENDS) as FriendId[]).reduce((acc,id)=>{acc[id]={...FRIENDS[id].story,...(saved[id]||{})};return acc;},{} as Record<FriendId,Story>)});
  const [toast,setToast]=useState<string|null>(null);
  const [call,setCall]=useState<{friend:FriendId;kind:'audio'|'video';state:'ringing'|'connected';startedAt?:number}|null>(null);
  const [tweets,setTweets]=useState<Tweet[]>(()=>load('dm-besties-tweets-v3',initialTweets));
  const [tweetDraft,setTweetDraft]=useState('');
  const [tweetImage,setTweetImage]=useState<string|undefined>();
  const [generatingTweet,setGeneratingTweet]=useState(false);
  const [replyingTo,setReplyingTo]=useState<{tweetId:string;replyId:string}|null>(null);
  const [mobileFriendsOpen,setMobileFriendsOpen]=useState(false);
  const [replyDraft,setReplyDraft]=useState('');
  const [weather,setWeather]=useState<{temperature_2m?:number;apparent_temperature?:number;weather_code?:number}>({});
  const fileInput=useRef<HTMLInputElement|null>(null); const tweetFileInput=useRef<HTMLInputElement|null>(null); const listRef=useRef<HTMLDivElement|null>(null);
  const recorderRef=useRef<MediaRecorder|null>(null); const audioChunks=useRef<Blob[]>([]);
  const friend=FRIENDS[activeFriend];

  useEffect(()=>save('dm-besties-chats',chats),[chats]);
  useEffect(()=>save('dm-besties-unread',unread),[unread]);
  useEffect(()=>save('dm-besties-sound',soundOn),[soundOn]);
  useEffect(()=>save('dm-besties-stories',storyData),[storyData]);
  useEffect(()=>save('dm-besties-story-cycle',storyCycle),[storyCycle]);
  useEffect(()=>save('dm-besties-tweets-v3',tweets),[tweets]);
  useEffect(()=>{fetch('/api/weather').then(r=>r.ok?r.json():null).then(x=>x?.current&&setWeather(x.current)).catch(()=>{});},[]);

  useEffect(()=>{ if(tab==='dms') requestAnimationFrame(()=>listRef.current?.scrollTo({top:listRef.current.scrollHeight,behavior:'smooth'})); },[chats,activeFriend,typing,tab]);

  useEffect(()=>{
    const timers:number[]=[];
    const schedule=(id:FriendId)=>{
      const timer=window.setTimeout(async()=>{await proactiveMessage(id);schedule(id);},35000+Math.random()*65000);
      timers.push(timer);
    };
    (Object.keys(FRIENDS) as FriendId[]).forEach(schedule);
    return()=>timers.forEach(clearTimeout);
  },[]);

  useEffect(()=>{
    const iv=window.setInterval(()=>{
      setTweets(prev=>prev.map(t=>{
        if(!t.pending?.length)return t;
        const now=Date.now(); const due=t.pending.filter(r=>r.visibleAt&&r.visibleAt<=now); const keep=t.pending.filter(r=>!r.visibleAt||r.visibleAt>now);
        return due.length?{...t,replies:[...t.replies,...due],pending:keep}:t;
      }));
    },1000);
    return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    if(!call||call.state!=='ringing')return;
    const t=window.setTimeout(()=>setCall(c=>c?{...c,state:'connected',startedAt:Date.now()}:null),2500);
    return()=>clearTimeout(t);
  },[call]);

  useEffect(()=>{
    if(!call||call.state!=='connected')return;
    const iv=setInterval(()=>setCall(c=>c?{...c}:null),1000); return()=>clearInterval(iv);
  },[call]);

  const playPing=()=>{if(!soundOn)return;try{const Ctx=window.AudioContext||((window as any).webkitAudioContext);const ctx=new Ctx();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.frequency.value=680;gain.gain.value=.055;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.09);}catch{}}
  const showToast=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(null),2600)};

  async function proactiveMessage(id:FriendId){
    try{
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({friendId:id,messages:chats[id].slice(-8),proactive:true})});
      if(!res.ok) return;
      const data=await res.json(); if(!Array.isArray(data.messages))return;
      const newMsgs:Message[]=data.messages.map((m:{text:string})=>({id:crypto.randomUUID(),role:'friend',text:m.text,ts:Date.now(),seen:false}));
      setChats(c=>({...c,[id]:[...c[id],...newMsgs]}));
      if(id!==activeFriend||tab!=='dms')setUnread(u=>({...u,[id]:u[id]+1}));
      playPing(); showToast(`${FRIENDS[id].name} sent you a message`);
    }catch{}
  }

  async function sendMessage(){
    const text=input.trim(); if(!text||typing)return;
    setInput(''); const userMsg:Message={id:crypto.randomUUID(),role:'user',text,ts:Date.now(),seen:false};
    setChats(c=>({...c,[activeFriend]:[...c[activeFriend],userMsg]})); setTyping(true); setUnread(u=>({...u,[activeFriend]:0}));
    try{
      const messages=[...chats[activeFriend],userMsg].map(m=>({role:m.role==='user'?'user':'model',text:m.text||'[media]'}));
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({friendId:activeFriend,messages})});
      const data=await res.json(); if(!res.ok)throw new Error(data.error||'Chat generation failed');
      const replyMsgs=(data.messages||[]).map((m:{text:string})=>({id:crypto.randomUUID(),role:'friend' as const,text:m.text,ts:Date.now(),seen:true}));
      setChats(c=>({...c,[activeFriend]:[...c[activeFriend],...replyMsgs]})); playPing();
    }catch(e){showToast(e instanceof Error?e.message:'Could not send message');}
    finally{setTyping(false);}
  }

  function onComposerKey(e:KeyboardEvent<HTMLInputElement>){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}
  function markRead(id:FriendId){setUnread(u=>({...u,[id]:0}));}

  async function sendPhoto(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{const msg:Message={id:crypto.randomUUID(),role:'user',image:String(reader.result),ts:Date.now()};setChats(c=>({...c,[activeFriend]:[...c[activeFriend],msg]}));showToast('Photo sent');};reader.readAsDataURL(f);e.target.value='';}
  async function toggleVoice(){
    if(recorderRef.current){recorderRef.current.stop();return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});const rec=new MediaRecorder(stream);recorderRef.current=rec;audioChunks.current=[];
      rec.ondataavailable=e=>e.data.size&&audioChunks.current.push(e.data); rec.onstop=()=>{const blob=new Blob(audioChunks.current,{type:rec.mimeType});const reader=new FileReader();reader.onload=()=>setChats(c=>({...c,[activeFriend]:[...c[activeFriend],{id:crypto.randomUUID(),role:'user',audio:String(reader.result),ts:Date.now()}]}));reader.readAsDataURL(blob);stream.getTracks().forEach(t=>t.stop());recorderRef.current=null;showToast('Voice note sent');};rec.start();showToast('Recording… tap mic to stop');
    }catch{showToast('Microphone access is unavailable.');}
  }
  async function generateStory(id:FriendId,variation?:number){
    const next=variation??((storyCycle[id]||0)+1);
    try{
      const r=await fetch('/api/generate-story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({friendId:id,variation:next})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Story generation failed');
      const local=FRONTEND_STORY_VARIANTS[id][next%FRONTEND_STORY_VARIANTS[id].length];
      setStoryData(s=>({...s,[id]:{...s[id],...local,...d,imageUrl:d.imageUrl||local.imageUrl,imageAlt:d.imageAlt||local.imageAlt,comments:d.comments?.length?d.comments:local.comments,revision:next}}));
    }catch(e){
      showToast(e instanceof Error?e.message:'Story refresh failed');
    }
  }
  async function openStory(id:FriendId){
    const next=(storyCycle[id]||0)+1;
    const variant=FRONTEND_STORY_VARIANTS[id][next%FRONTEND_STORY_VARIANTS[id].length];
    setStoryCycle(c=>({...c,[id]:next}));
    setStoryData(s=>({...s,[id]:{...s[id],...variant,revision:next}}));
    setStory(id);
    void generateStory(id,next);
  }
  async function makeCall(kind:'audio'|'video'){setCall({friend:activeFriend,kind,state:'ringing'});playPing();}

  function encodeTweetImage(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>setTweetImage(String(r.result));r.readAsDataURL(f);e.target.value='';}
  async function postTweet(){
    const text=tweetDraft.trim(); if(!text||generatingTweet)return;
    setGeneratingTweet(true);
    try{
      const lang=languageOf(text); const r=await fetch('/api/tweet-replies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tweet:text,language:lang,context:`Yun is an exchange student in Seoul. Current weather: ${weather.temperature_2m??'unknown'}°C, ${weatherLabel(weather.weather_code)}.`})});
      const d=await r.json(); if(!r.ok)throw new Error(d.error||'Could not generate replies');
      const now=Date.now(); const replies=(d.replies||[]).map((x:TweetReply)=>({...x,delaySeconds:0,visibleAt:now}));
      const tweet:Tweet={id:crypto.randomUUID(),text,image:tweetImage,ts:now,likes:0,retweets:0,bookmarks:0,postedLanguage:lang,replies,pending:[]};
      setTweets(t=>[tweet,...t]);setTweetDraft('');setTweetImage(undefined);showToast('Posted. Replies are coming in over the next 75 seconds.');
    }catch(e){showToast(e instanceof Error?e.message:'Could not generate replies');}
    finally{setGeneratingTweet(false);}
  }
  function updateTweet(id:string,patch:Partial<Tweet>){setTweets(t=>t.map(x=>x.id===id?{...x,...patch}:x));}
  async function submitReply(tweetId:string,replyId:string|undefined,text:string){
    if(!text.trim())return;
    setReplyingTo(null);setReplyDraft('');
    setTweets(ts=>ts.map(t=>t.id===tweetId?{...t,replies:[...t.replies,{id:crypto.randomUUID(),username:'Yun',handle:'@yunseoul',text:text.trim(),likes:0,retweets:0,delaySeconds:0,type:'user'}]}:t));
    const t=tweets.find(x=>x.id===tweetId);
    if(!t)return;
    if(replyId){
      const r=t.replies.find(x=>x.id===replyId); if(!r)return;
      try{const res=await fetch('/api/reply-to-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tweet:t.text,reply:text,language:t.postedLanguage,displayName:r.username})});const d=await res.json();if(!res.ok)throw new Error(d.error);const rs=(d.replies||[]).map((x:any)=>({id:crypto.randomUUID(),username:r.username,handle:r.handle,text:x.text,likes:x.likes,retweets:x.retweets,delaySeconds:2,type:'reply'}));setTweets(ts=>ts.map(tt=>tt.id===tweetId?{...tt,pending:[...(tt.pending||[]),...rs.map((x:any)=>({...x,visibleAt:Date.now()+2000}))]}:tt));}catch(e){showToast(e instanceof Error?e.message:'Reply failed');}
    } else {
      try{const res=await fetch('/api/tweet-replies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tweet:text,language:t.postedLanguage,context:`This is a thread update under Yun's original post: ${t.text}. React specifically to the update.`})});const d=await res.json();if(!res.ok)throw new Error(d.error);const now=Date.now();const rs=(d.replies||[]).slice(0,5).map((x:any,i:number)=>({...x,id:crypto.randomUUID(),delaySeconds:Math.min(40,3+i*7),visibleAt:now+Math.min(40,3+i*7)*1000}));setTweets(ts=>ts.map(tt=>tt.id===tweetId?{...tt,pending:[...(tt.pending||[]),...rs]}:tt));}catch(e){showToast(e instanceof Error?e.message:'Thread reactions failed');}
    }
  }

  const currentStory=story?storyData[story]:null;
  const visibleTweets=useMemo(()=>tweets,[tweets]);

  return <div className={`app-shell theme-${theme}`}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Sparkles size={16}/></div><span>DM Besties</span></div>
      <div className="top-tabs"><button onClick={()=>setTab('dms')} className={tab==='dms'?'tab-active':''}><MessageCircle size={16}/> DMs</button><button onClick={()=>setTab('feed')} className={tab==='feed'?'tab-active':''}><span className="x-logo">𝕏</span> Feed</button></div>
      <div className="top-actions"><div className="seoul-chip"><CloudSun size={15}/><span>Seoul {weather.temperature_2m!=null?`${Math.round(weather.temperature_2m)}°`:''}</span></div><button className="icon-btn" onClick={()=>setSoundOn(x=>!x)} title="Sound">{soundOn?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className="icon-btn"><Settings2 size={18}/></button></div>
    </header>

    {tab==='dms'?<main className="dm-layout">
      <aside className="friends-panel">
        <div className="panel-head"><div><h1>Messages</h1><p>3 besties online-ish</p></div><button className="round-plus"><Plus size={18}/></button></div>
        <div className="story-row">{(Object.keys(FRIENDS) as FriendId[]).map(id=>{const f=FRIENDS[id];return <button key={id} className="story-mini" onClick={()=>openStory(id)}><div className="story-ring"><img src={f.avatar}/></div><span>{f.name}</span></button>})}</div>
        <div className="friends-list">{(Object.keys(FRIENDS) as FriendId[]).map(id=>{const f=FRIENDS[id];const last=[...chats[id]].at(-1);return <button key={id} onClick={()=>{setActiveFriend(id);markRead(id)}} className={`friend-row ${activeFriend===id?'selected':''}`}><div className="avatar-wrap"><img src={f.avatar}/><span className="online-dot"/></div><div className="friend-copy"><div className="friend-name"><b>{f.name}</b>{unread[id]>0&&<span className="unread-dot">{unread[id]}</span>}</div><span>{last?.text||'sent a photo'}</span></div><span className="friend-time">{last?formatTime(last.ts):''}</span></button>})}</div>
      </aside>

      <section className={`chat-panel chat-${theme}`}>
        <div className="chat-head"><div className="chat-person"><button className="mobile-back" onClick={()=>setMobileFriendsOpen(true)}><ChevronLeft size={19}/></button><button className="avatar-button" onClick={()=>setProfile(activeFriend)}><img src={friend.avatar}/><span className="online-dot"/></button><button className="chat-title" onClick={()=>setProfile(activeFriend)}><strong>{friend.name}</strong><span>{friend.status}</span></button></div><div className="chat-actions"><button className="icon-btn" onClick={()=>makeCall('audio')}><Phone size={18}/></button><button className="icon-btn" onClick={()=>makeCall('video')}><Video size={18}/></button><button className="icon-btn" onClick={()=>setTheme(t=>t==='soft'?'lilac':t==='lilac'?'peach':'soft')}><Sun size={18}/></button></div></div>
          <div className="story-banner" onClick={()=>openStory(activeFriend)}><div className="story-ring small"><img src={friend.avatar}/></div><div><b>{friend.name}’s story</b><span>{storyData[activeFriend]?.caption}</span></div><span className="story-chevron">›</span></div>
          <div className="messages" ref={listRef}>
            <div className="date-pill">Today · Seoul</div>
            {chats[activeFriend].map(m=><div key={m.id} className={`message-row ${m.role==='user'?'me':''}`}>
              {m.role==='friend'?<img className="msg-avatar" src={friend.avatar}/>:<div className="msg-spacer"/>}
              <div className="bubble-wrap">
                <div className={`bubble ${m.role==='user'?'bubble-me':''}`} onDoubleClick={()=>setChats(c=>({...c,[activeFriend]:c[activeFriend].map(x=>x.id===m.id?{...x,reactions:x.reactions?.length?[]:['❤️']}:x)}))}>
                  {m.image&&<img className="bubble-image" src={m.image}/>} {m.text&&<div>{m.text}</div>}
                  {m.audio&&<audio controls src={m.audio}/>}
                  {m.reactions?.length ? <span className="reaction-badge">{m.reactions.join(' ')}</span> : null}
                </div>
                <div className="msg-meta">{formatTime(m.ts)} {m.role==='user'&&<span>{m.seen?'Seen':'Sent'}</span>} <button className="react-quick" onClick={()=>setChats(c=>({...c,[activeFriend]:c[activeFriend].map(x=>x.id===m.id?{...x,reactions:x.reactions?.length?[]:['❤️']}:x)}))}>♥</button></div>
              </div>
            </div>)}
            {typing&&<div className="message-row"><img className="msg-avatar" src={friend.avatar}/><div className="typing"><i/><i/><i/></div></div>}
          </div>
          <div className="composer"><button className="compose-icon" onClick={()=>fileInput.current?.click()}><ImageIcon size={20}/></button><input ref={fileInput as any} type="file" accept="image/*" hidden onChange={sendPhoto}/><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onComposerKey} placeholder={`Message ${friend.name}...`}/><button className="compose-icon" onClick={toggleVoice}><Mic size={19}/></button><button className="send-btn" onClick={sendMessage}><Send size={17}/></button></div>
        </section>
      </main>:<main className="feed-shell">
        <section className="feed-column">
          <div className="feed-head"><div><h1>For you</h1><span>Seoul side of the internet</span></div><button className="icon-btn"><MoreHorizontal size={19}/></button></div>
          <div className="tweet-composer"><div className="user-avatar">Y</div><div className="tweet-compose-body"><textarea value={tweetDraft} onChange={e=>setTweetDraft(e.target.value)} placeholder="What’s happening in Seoul?" maxLength={280}/>{tweetImage&&<div className="compose-image-wrap"><img src={tweetImage}/><button onClick={()=>setTweetImage(undefined)}><X size={16}/></button></div>}<div className="tweet-compose-footer"><div className="tweet-tools"><button onClick={()=>tweetFileInput.current?.click()}><ImageIcon size={18}/></button><input ref={tweetFileInput as any} type="file" accept="image/*" hidden onChange={encodeTweetImage}/><button><Smile size={18}/></button><button><MapPin size={18}/></button></div><div className="tweet-submit"><span>{tweetDraft.length}/280</span><button disabled={!tweetDraft.trim()||generatingTweet} onClick={postTweet}>{generatingTweet?'Posting…':'Post'}</button></div></div></div></div>
          <div className="feed-divider"/>
          {visibleTweets.map(t=><article className="tweet-card" key={t.id}><div className="tweet-avatar">Y</div><div className="tweet-main"><div className="tweet-line"><b>Yun</b><span>@yunseoul</span><span>·</span><span>{formatTime(t.ts)}</span><button><MoreHorizontal size={17}/></button></div><div className="tweet-text">{t.text}</div>{t.image&&<img className="tweet-image" src={t.image}/>}<div className="tweet-actions"><button onClick={()=>setReplyingTo({tweetId:t.id,replyId:''})}><Reply size={18}/><span>{t.replies.length+(t.pending?.length||0)}</span></button><button className={t.retweeted?'active-action':''} onClick={()=>updateTweet(t.id,{retweeted:!t.retweeted,retweets:t.retweets+(t.retweeted?-1:1)})}><Repeat2 size={18}/><span>{t.retweets}</span></button><button className={t.liked?'active-like':''} onClick={()=>updateTweet(t.id,{liked:!t.liked,likes:t.likes+(t.liked?-1:1)})}><Heart size={18}/><span>{t.likes}</span></button><button className={t.bookmarked?'active-bookmark':''} onClick={()=>updateTweet(t.id,{bookmarked:!t.bookmarked,bookmarks:t.bookmarks+(t.bookmarked?-1:1)})}><Bookmark size={18}/><span>{t.bookmarks}</span></button></div>
              {t.replies.length>0&&<div className="replies">{t.replies.map(r=><div className={r.replyToHandle?'reply-item reply-branch':'reply-item'} key={r.id}><div className="reply-avatar" style={{background:avatarColor(r.avatarSeed||r.handle)}}>{r.username[0]?.toUpperCase()||'•'}</div><div className="reply-body"><div className="reply-head"><b>{r.username}</b><span>{r.handle}</span>{r.replyToHandle&&<span>↳ {r.replyToHandle}</span>}<span>·</span><span>{r.type}</span></div><div className="reply-text">{r.text}</div><div className="reply-tools"><button onClick={()=>setReplyingTo({tweetId:t.id,replyId:r.id})}><Reply size={14}/> reply</button><button><Heart size={14}/> {r.likes}</button><button><Repeat2 size={14}/> {r.retweets}</button></div>{replyingTo?.tweetId===t.id&&replyingTo.replyId===r.id&&<div className="reply-composer"><input autoFocus value={replyDraft} onChange={e=>setReplyDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitReply(t.id,r.id,replyDraft)}} placeholder="Reply…"/><button onClick={()=>submitReply(t.id,r.id,replyDraft)}><ArrowUp size={17}/></button></div>}</div></div>)}</div>}
              {replyingTo?.tweetId===t.id&&replyingTo.replyId===''&&<div className="reply-composer root"><input autoFocus value={replyDraft} onChange={e=>setReplyDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitReply(t.id,undefined,replyDraft)}} placeholder="Post a reply…"/><button onClick={()=>submitReply(t.id,undefined,replyDraft)}><ArrowUp size={17}/></button></div>}
            </div></article>)}
        </section>
        <aside className="feed-side"><div className="side-card"><h3>Seoul right now</h3><div className="weather-big"><CloudSun size={28}/><div><strong>{weather.temperature_2m!=null?`${Math.round(weather.temperature_2m)}°C`:'—'}</strong><span>{weatherLabel(weather.weather_code)} · feels {weather.apparent_temperature!=null?`${Math.round(weather.apparent_temperature)}°`:''}</span></div></div><p>30-min cached Open-Meteo context feeds the besties.</p></div><div className="side-card"><h3>Your besties</h3>{(Object.keys(FRIENDS) as FriendId[]).map(id=><button className="side-friend" key={id} onClick={()=>{setTab('dms');setActiveFriend(id)}}><img src={FRIENDS[id].avatar}/><div><b>{FRIENDS[id].name}</b><span>{FRIENDS[id].vibe.split(' · ')[0]}</span></div><span className="online-dot static"/></button>)}</div></aside>
      </main>}

    {mobileFriendsOpen&&<div className="mobile-friends-backdrop" onClick={()=>setMobileFriendsOpen(false)}><div className="mobile-friends-drawer" onClick={e=>e.stopPropagation()}><div className="panel-head"><div><h1>Messages</h1><p>Choose a bestie</p></div><button className="round-plus" onClick={()=>setMobileFriendsOpen(false)}><X size={18}/></button></div>{(Object.keys(FRIENDS) as FriendId[]).map(id=>{const f=FRIENDS[id];return <button key={id} onClick={()=>{setActiveFriend(id);markRead(id);setMobileFriendsOpen(false)}} className={`friend-row ${activeFriend===id?'selected':''}`}><div className="avatar-wrap"><img src={f.avatar}/><span className="online-dot"/></div><div className="friend-copy"><div className="friend-name"><b>{f.name}</b></div><span>{f.status}</span></div></button>})}</div></div>}

    {profile&&<div className="modal-backdrop" onClick={()=>setProfile(null)}><div className="profile-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setProfile(null)}><X size={18}/></button><div className="profile-cover"><div className="profile-large"><img src={FRIENDS[profile].avatar}/></div></div><div className="profile-content"><h2>{FRIENDS[profile].name}, {FRIENDS[profile].age}</h2><span className="handle">{FRIENDS[profile].handle}</span><p>{FRIENDS[profile].bio}</p><div className="tag-row">{FRIENDS[profile].vibe.split(' · ').map(t=><span key={t}>{t}</span>)}</div><div className="profile-status"><span className="online-dot static"/> {FRIENDS[profile].status}</div><button className="primary-btn" onClick={()=>{setActiveFriend(profile);setProfile(null);setTab('dms')}}>Message</button></div></div></div>}

    {story&&currentStory&&<div className="modal-backdrop story-backdrop" onClick={()=>setStory(null)}><div className={`story-modal bg-gradient-to-br ${currentStory.theme}`} onClick={e=>e.stopPropagation()}><div className="story-top"><div className="story-author"><img src={FRIENDS[story].avatar}/><div><b>{FRIENDS[story].name}</b><span>now · Seoul</span></div></div><button onClick={()=>setStory(null)}><X size={19}/></button></div><div className="story-center"><div className="fake-photo">{currentStory.imageUrl&&<img className="story-photo" src={currentStory.imageUrl} alt={currentStory.imageAlt||'Story photo'} onError={e=>{const img=e.currentTarget; img.src=FRONTEND_STORY_VARIANTS[story!][((currentStory.revision||0)+1)%FRONTEND_STORY_VARIANTS[story!].length].imageUrl!;}}/>}<div className="story-photo-overlay"><Sparkles size={30}/><span>{STORY_BY_TIME(FRIENDS[story].name)[0]}</span></div></div></div><div className="story-bottom"><b>{currentStory.caption}</b><span><Music2 size={14}/> {currentStory.music}</span><span><MapPin size={14}/> {currentStory.location}</span>{currentStory.comments?.length&&<div className="story-comments"><b>Replies</b>{currentStory.comments.map((c,i)=><span key={i}>♡ {c}</span>)}</div>}<button onClick={()=>{const next=(storyCycle[story]||0)+1;setStoryCycle(c=>({...c,[story]:next}));void generateStory(story,next)}}><Sparkles size={14}/> New story</button></div></div></div>}

    {call&&<div className="call-overlay"><div className="call-card"><img className="call-avatar" src={FRIENDS[call.friend].avatar}/><div className="call-name">{FRIENDS[call.friend].name}</div><div className="call-status">{call.state==='ringing'?`calling ${call.kind}…`:formatTime(call.startedAt||Date.now())}</div>{call.state==='ringing'?<div className="call-pulse"><span/><span/><span/></div>:<div className="call-timer"><Clock3 size={17}/> {Math.max(0,Math.floor((Date.now()-(call.startedAt||Date.now()))/1000))}s</div>}<div className="call-controls"><button onClick={()=>setCall(null)} className="hangup"><Phone size={20}/></button><button onClick={()=>makeCall(call.kind==='audio'?'video':'audio')}>{call.kind==='audio'?<Video size={20}/>:<AudioLines size={20}/>}</button></div></div></div>}

    {toast&&<div className="toast"><CheckCheck size={16}/>{toast}</div>}
  </div>
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root was not found.');
createRoot(root).render(<App />);
