import { useState, useEffect, useRef } from "react";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCnWG1dMC30IcX2EMBXWc5vaoX5ri0CWRg",
  projectId: "time-planner-app-7b04a",
};

const COLORS = {
  bg: "#0F172A", card: "#1E293B", cardAlt: "#162032",
  accent: "#6366F1", accentGlow: "#818CF8",
  success: "#10B981", danger: "#EF4444", warn: "#F59E0B",
  text: "#F1F5F9", muted: "#94A3B8", border: "#334155",
};

const DEFAULT_SCHEDULE = [
  { id: 1, time: "06:00", task: "Morning Walk / Exercise", done: false, alert: true },
  { id: 2, time: "07:00", task: "Breakfast + News Reading", done: false, alert: false },
  { id: 3, time: "09:00", task: "BBA Study / Assignment", done: false, alert: true },
  { id: 4, time: "12:00", task: "Lunch Break", done: false, alert: false },
  { id: 5, time: "14:00", task: "CAT Prep (Maths/Reasoning)", done: false, alert: true },
  { id: 6, time: "17:00", task: "Office Work / WFH Tasks", done: false, alert: false },
  { id: 7, time: "20:00", task: "English Reading (Hindu/BBC)", done: false, alert: true },
  { id: 8, time: "22:00", task: "Night Routine + Sleep", done: false, alert: true },
];
const DEFAULT_TODOS = [
  { id: 1, text: "Salesforce Trailhead module complete karo", priority: "high", done: false },
  { id: 2, text: "LinkedIn profile update karo", priority: "medium", done: false },
  { id: 3, text: "CAT Percentage chapter practice", priority: "high", done: false },
  { id: 4, text: "Stock App ka Excel export check karo", priority: "low", done: false },
];
// Not-To-Do: added "broken" field — roz manually mark karo agar toda
const DEFAULT_NOTTODOS = [
  { id: 1, text: "Raat ko 12 ke baad phone mat chalao", category: "health", broken: false },
  { id: 2, text: "Bina kaam ke social media scroll mat karo", category: "focus", broken: false },
  { id: 3, text: "Study time mein YouTube shorts mat dekho", category: "focus", broken: false },
  { id: 4, text: "Junk food zyada mat khao", category: "health", broken: false },
];

const PRIORITY_COLOR = { high: COLORS.danger, medium: COLORS.warn, low: COLORS.success };
const CAT_ICON = { health: "🍎", focus: "🎯", finance: "💰", social: "🚫" };
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const USER_ID = "vishal";
const BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

function todayStr() { return new Date().toISOString().split("T")[0]; }
function getTimeInMinutes(t) { const [h,m]=t.split(":").map(Number); return h*60+m; }
function getNowMinutes() { const n=new Date(); return n.getHours()*60+n.getMinutes(); }
function formatTime12(t) {
  const [h,m]=t.split(":").map(Number);
  return `${h%12||12}:${m.toString().padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}

function toFS(obj) {
  const fields = {};
  for (const [k,v] of Object.entries(obj)) {
    if (typeof v==="string") fields[k]={stringValue:v};
    else if (typeof v==="boolean") fields[k]={booleanValue:v};
    else if (typeof v==="number") fields[k]={integerValue:String(v)};
    else fields[k]={stringValue:JSON.stringify(v)};
  }
  return { fields };
}
function fromFS(doc) {
  if (!doc?.fields) return null;
  const obj={};
  for (const [k,v] of Object.entries(doc.fields)) {
    if (v.stringValue!==undefined){try{obj[k]=JSON.parse(v.stringValue);}catch{obj[k]=v.stringValue;}}
    else if (v.booleanValue!==undefined) obj[k]=v.booleanValue;
    else if (v.integerValue!==undefined) obj[k]=Number(v.integerValue);
    else obj[k]=null;
  }
  return obj;
}
async function fbGet(path) {
  try { const r=await fetch(`${BASE}/${path}`); if(!r.ok) return null; return fromFS(await r.json()); } catch { return null; }
}
async function fbSet(path, data) {
  try {
    const fields=toFS(data).fields;
    const mask=Object.keys(fields).map(f=>`updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
    await fetch(`${BASE}/${path}?${mask}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});
  } catch {}
}
async function saveArr(path, arr) { await fbSet(path,{data:JSON.stringify(arr),updatedAt:Date.now()}); }
async function loadArr(path) {
  const doc=await fbGet(path); if(!doc?.data) return null;
  try{return JSON.parse(doc.data);}catch{return null;}
}

function gradeColor(g) {
  if(g==="A+"||g==="A") return COLORS.success;
  if(g==="B") return COLORS.accent;
  if(g==="C") return COLORS.warn;
  return COLORS.danger;
}
function gradeLetter(p) {
  if(p>=90) return "A+"; if(p>=75) return "A"; if(p>=60) return "B"; if(p>=40) return "C"; return "D";
}

function CircleProgress({pct,size=100,stroke=9,color,label,sublabel}) {
  const r=(size-stroke)/2,circ=2*Math.PI*r,offset=circ-(pct/100)*circ;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS.border} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset 0.8s ease"}}/>
        <text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size*0.17} fontWeight="900">{pct}%</text>
      </svg>
      <div style={{fontSize:12,fontWeight:700,color:COLORS.text}}>{label}</div>
      {sublabel&&<div style={{fontSize:10,color:COLORS.muted}}>{sublabel}</div>}
    </div>
  );
}

function ProgressBar({label,pct,color}) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:13,fontWeight:600}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color}}>{pct}%</span>
      </div>
      <div style={{height:8,background:COLORS.cardAlt,borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:99,transition:"width 0.8s ease"}}/>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("schedule");
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [todos, setTodos] = useState(DEFAULT_TODOS);
  const [notTodos, setNotTodos] = useState(DEFAULT_NOTTODOS);
  const [perfHistory, setPerfHistory] = useState([]);
  const [newTask, setNewTask] = useState({time:"",task:"",alert:false});
  const [newTodo, setNewTodo] = useState({text:"",priority:"medium"});
  const [newNotTodo, setNewNotTodo] = useState({text:"",category:"focus"});
  const [alerts, setAlerts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [syncStatus, setSyncStatus] = useState("loading");
  const alertedRef = useRef(new Set());
  const saveTimer = useRef({});

  useEffect(()=>{
    async function loadData() {
      setSyncStatus("loading");
      try {
        const [s,t,n,h]=await Promise.all([
          loadArr(`schedule/${USER_ID}`),
          loadArr(`todos/${USER_ID}`),
          loadArr(`nottodos/${USER_ID}`),
          loadArr(`perfHistory/${USER_ID}`),
        ]);
        if(s) setSchedule(s);
        if(t) setTodos(t);
        if(n) setNotTodos(n.map(x=>({...x,broken:x.broken??false})));
        if(h) setPerfHistory(h);
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
    }
    loadData();
  },[]);

  function debouncedSave(key,data,delay=1500) {
    if(saveTimer.current[key]) clearTimeout(saveTimer.current[key]);
    setSyncStatus("saving");
    saveTimer.current[key]=setTimeout(async()=>{
      await saveArr(key,data); setSyncStatus("synced");
    },delay);
  }

  useEffect(()=>{if(syncStatus==="loading") return; debouncedSave(`schedule/${USER_ID}`,schedule);},[schedule]);
  useEffect(()=>{if(syncStatus==="loading") return; debouncedSave(`todos/${USER_ID}`,todos);},[todos]);
  useEffect(()=>{if(syncStatus==="loading") return; debouncedSave(`nottodos/${USER_ID}`,notTodos);},[notTodos]);

  // Save performance history permanently
  useEffect(()=>{
    if(syncStatus==="loading") return;
    const sp=schedule.length?Math.round((schedule.filter(s=>s.done).length/schedule.length)*100):0;
    const tp=todos.length?Math.round((todos.filter(t=>t.done).length/todos.length)*100):0;
    // Not-To-Do score: % of rules NOT broken (followed)
    const ntTotal=notTodos.length;
    const ntBroken=notTodos.filter(n=>n.broken).length;
    const ntFollowed=ntTotal-ntBroken;
    const ntPct=ntTotal?Math.round((ntFollowed/ntTotal)*100):100;
    // Overall = average of all 3
    const overall=Math.round((sp+tp+ntPct)/3);
    const today=todayStr();
    setPerfHistory(prev=>{
      const updated=[...prev.filter(h=>h.date!==today),
        {date:today,schedPct:sp,todoPct:tp,ntPct,ntBroken,ntTotal,overall,grade:gradeLetter(overall)}
      ].sort((a,b)=>a.date.localeCompare(b.date));
      debouncedSave(`perfHistory/${USER_ID}`,updated);
      return updated;
    });
  },[schedule,todos,notTodos]);

  useEffect(()=>{
    const t=setInterval(()=>setCurrentTime(new Date()),30000);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    const nowMin=getNowMinutes();
    schedule.forEach(item=>{
      if(!item.alert||item.done) return;
      const diff=getTimeInMinutes(item.time)-nowMin;
      const k5=`5-${item.id}`,k0=`0-${item.id}`;
      if(diff<=5&&diff>0&&!alertedRef.current.has(k5)){alertedRef.current.add(k5);triggerAlert(`⏰ 5 min mein: ${item.task}`,"warn");}
      if(diff<=0&&diff>-2&&!alertedRef.current.has(k0)){alertedRef.current.add(k0);triggerAlert(`🔔 Ab karo: ${item.task}`,"accent");}
    });
  },[currentTime,schedule]);

  function triggerAlert(msg,type="accent"){
    const id=Date.now();
    setAlerts(prev=>[...prev,{id,msg,type}]);
    setTimeout(()=>setAlerts(prev=>prev.filter(a=>a.id!==id)),5000);
    if("Notification" in window) Notification.requestPermission().then(p=>{if(p==="granted") new Notification("📅 Daily Planner",{body:msg});});
  }
  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),2500);}

  const nowMin=getNowMinutes();
  const upcoming=schedule.find(s=>!s.done&&getTimeInMinutes(s.time)>=nowMin);
  const schedDone=schedule.filter(s=>s.done).length;
  const schedTotal=schedule.length;
  const schedPct=schedTotal?Math.round((schedDone/schedTotal)*100):0;
  const todoDone=todos.filter(t=>t.done).length;
  const todoTotal=todos.length;
  const todoPct=todoTotal?Math.round((todoDone/todoTotal)*100):0;
  const ntTotal=notTodos.length;
  const ntBroken=notTodos.filter(n=>n.broken).length;
  const ntFollowed=ntTotal-ntBroken;
  const ntPct=ntTotal?Math.round((ntFollowed/ntTotal)*100):100;
  const overallPct=Math.round((schedPct+todoPct+ntPct)/3);
  const highDone=todos.filter(t=>t.priority==="high"&&t.done).length;
  const highTotal=todos.filter(t=>t.priority==="high").length;

  function getGrade(pct){
    if(pct>=90) return{g:"A+",color:COLORS.success,msg:"Ekdum zabardast! 🔥"};
    if(pct>=75) return{g:"A",color:COLORS.success,msg:"Bahut accha! 💪"};
    if(pct>=60) return{g:"B",color:COLORS.accent,msg:"Theek hai, aur mehnat karo!"};
    if(pct>=40) return{g:"C",color:COLORS.warn,msg:"Koshish kar, improve hoga 📈"};
    return{g:"D",color:COLORS.danger,msg:"Aaj thoda slow tha, kal better karo!"};
  }
  const grade=getGrade(overallPct);
  const syncColor=syncStatus==="synced"?COLORS.success:syncStatus==="error"?COLORS.danger:COLORS.warn;
  const syncIcon=syncStatus==="loading"?"⏳":syncStatus==="saving"?"🔄":syncStatus==="synced"?"☁️":"⚠️";

  const last30=perfHistory.slice(-30);
  const monthlySummary={};
  perfHistory.forEach(h=>{
    const[y,m]=h.date.split("-"),key=`${y}-${m}`;
    if(!monthlySummary[key]) monthlySummary[key]={scores:[],y,m};
    monthlySummary[key].scores.push(h.overall);
  });
  const monthlyArr=Object.entries(monthlySummary).map(([key,val])=>({
    key,label:`${MONTHS[parseInt(val.m)-1]} ${val.y}`,
    avg:Math.round(val.scores.reduce((a,b)=>a+b,0)/val.scores.length),
    days:val.scores.length,
  })).sort((a,b)=>a.key.localeCompare(b.key));
  const bestDay=perfHistory.length?perfHistory.reduce((a,b)=>a.overall>=b.overall?a:b):null;
  const worstDay=perfHistory.length?perfHistory.reduce((a,b)=>a.overall<=b.overall?a:b):null;
  const avgAll=perfHistory.length?Math.round(perfHistory.reduce((a,b)=>a+b.overall,0)/perfHistory.length):0;

  if(syncStatus==="loading") return(
    <div style={{minHeight:"100vh",background:COLORS.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontSize:48}}>📅</div>
      <div style={{fontSize:20,fontWeight:800,color:COLORS.text}}>Daily Planner</div>
      <div style={{fontSize:14,color:COLORS.muted}}>Firebase se data load ho raha hai...</div>
      <div style={{width:40,height:40,border:`3px solid ${COLORS.border}`,borderTop:`3px solid ${COLORS.accent}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:COLORS.bg,color:COLORS.text,fontFamily:"'Inter',system-ui,sans-serif",padding:"0 0 80px 0"}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${COLORS.accent}22,${COLORS.card})`,borderBottom:`1px solid ${COLORS.border}`,padding:"20px 20px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>📅 Daily Planner</div>
            <div style={{color:COLORS.muted,fontSize:13,marginTop:2}}>{currentTime.toLocaleDateString("hi-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:28,fontWeight:900,color:COLORS.accentGlow}}>{currentTime.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</div>
            <div style={{fontSize:11,color:syncColor,marginTop:2}}>{syncIcon} {syncStatus==="saving"?"Saving...":syncStatus==="synced"?"Cloud Synced":syncStatus==="error"?"Sync Error":"Loading..."}</div>
          </div>
        </div>
        {upcoming&&(
          <div style={{marginTop:12,background:`${COLORS.accent}22`,border:`1px solid ${COLORS.accent}44`,borderRadius:10,padding:"8px 14px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>⏭️</span>
            <div><div style={{fontSize:12,color:COLORS.accentGlow,fontWeight:600}}>NEXT UP</div><div style={{fontSize:14,fontWeight:600}}>{upcoming.task}</div></div>
            <div style={{marginLeft:"auto",background:COLORS.accent,borderRadius:8,padding:"4px 10px",fontSize:13,fontWeight:700}}>{formatTime12(upcoming.time)}</div>
          </div>
        )}
      </div>

      {/* Toasts */}
      <div style={{position:"fixed",top:10,right:10,zIndex:999,display:"flex",flexDirection:"column",gap:8}}>
        {alerts.map(a=>(<div key={a.id} style={{background:a.type==="warn"?COLORS.warn:COLORS.accent,color:"#fff",borderRadius:12,padding:"10px 16px",fontSize:13,fontWeight:600,boxShadow:"0 4px 20px #0008",maxWidth:280,animation:"slideIn 0.3s ease"}}>{a.msg}</div>))}
        {toast&&<div style={{background:COLORS.success,color:"#fff",borderRadius:12,padding:"10px 16px",fontSize:13,fontWeight:600,boxShadow:"0 4px 20px #0008",animation:"slideIn 0.3s ease"}}>{toast}</div>}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",padding:"14px 16px 0",gap:8,overflowX:"auto"}}>
        {[{key:"schedule",label:"📆 Schedule"},{key:"todo",label:"✅ Karna Hai"},{key:"nottodo",label:"🚫 Nahi Karna"},{key:"performance",label:"📊 Performance"}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:"9px 18px",borderRadius:24,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,whiteSpace:"nowrap",background:tab===t.key?COLORS.accent:COLORS.card,color:tab===t.key?"#fff":COLORS.muted,transition:"all 0.2s",boxShadow:tab===t.key?`0 0 16px ${COLORS.accent}66`:"none"}}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:16}}>

        {/* SCHEDULE */}
        {tab==="schedule"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <input value={newTask.time} onChange={e=>setNewTask({...newTask,time:e.target.value})} type="time" style={inputStyle}/>
              <input value={newTask.task} onChange={e=>setNewTask({...newTask,task:e.target.value})} placeholder="Task likho..." style={{...inputStyle,flex:1,minWidth:120}}/>
              <label style={{display:"flex",alignItems:"center",gap:6,color:COLORS.muted,fontSize:13,cursor:"pointer"}}>
                <input type="checkbox" checked={newTask.alert} onChange={e=>setNewTask({...newTask,alert:e.target.checked})}/> Alert
              </label>
              <button onClick={()=>{
                if(!newTask.time||!newTask.task.trim()) return;
                setSchedule(prev=>[...prev,{id:Date.now(),...newTask,done:false}].sort((a,b)=>getTimeInMinutes(a.time)-getTimeInMinutes(b.time)));
                setNewTask({time:"",task:"",alert:false});showToast("✅ Task save ho gaya!");
              }} style={btnStyle}>+ Add</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {schedule.map(item=>{
                const itemMin=getTimeInMinutes(item.time),isPast=itemMin<nowMin,isNow=Math.abs(itemMin-nowMin)<=30;
                return(
                  <div key={item.id} style={{background:item.done?`${COLORS.success}15`:isNow?`${COLORS.accent}20`:COLORS.card,border:`1px solid ${item.done?COLORS.success+"40":isNow?COLORS.accent+"60":COLORS.border}`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,opacity:isPast&&!isNow?0.6:1}}>
                    <div style={{background:item.done?COLORS.success:isNow?COLORS.accent:COLORS.cardAlt,borderRadius:10,padding:"6px 10px",textAlign:"center",minWidth:64}}>
                      <div style={{fontSize:13,fontWeight:800,color:item.done||isNow?"#fff":COLORS.accentGlow}}>{formatTime12(item.time)}</div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:600,textDecoration:item.done?"line-through":"none",color:item.done?COLORS.muted:COLORS.text}}>{item.task}</div>
                      {isNow&&!item.done&&<div style={{fontSize:11,color:COLORS.accent,fontWeight:700,marginTop:2}}>⚡ ABHI KA SAMAY</div>}
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      {item.alert&&<span style={{fontSize:16}}>🔔</span>}
                      <button onClick={()=>{setSchedule(prev=>prev.map(s=>s.id===item.id?{...s,done:!s.done}:s));showToast(item.done?"↩️ Undone!":"✅ Done! Shabash!");}} style={{background:item.done?COLORS.success:"transparent",border:`2px solid ${item.done?COLORS.success:COLORS.border}`,borderRadius:8,width:30,height:30,cursor:"pointer",color:item.done?"#fff":COLORS.muted,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{item.done?"✓":"○"}</button>
                      <button onClick={()=>{setSchedule(prev=>prev.filter(s=>s.id!==item.id));showToast("🗑️ Delete ho gaya");}} style={{background:"transparent",border:"none",cursor:"pointer",color:COLORS.muted,fontSize:16,padding:"0 4px"}}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:16,background:COLORS.card,borderRadius:14,padding:14,display:"flex",gap:16,justifyContent:"center"}}>
              <Stat label="Total" value={schedTotal} color={COLORS.accentGlow}/>
              <Stat label="Done ✅" value=
