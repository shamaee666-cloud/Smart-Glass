const DB_NAME="SmartGlassAI_DB", DB_VERSION=1, STORE="glasses";
let db, stream=null;

const $=id=>document.getElementById(id);
function msg(el,text,error=false){el.innerHTML=`<div class="${error?'msg err':'msg'}">${text}</div>`;}

function openDB(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});};
    r.onsuccess=e=>{db=e.target.result;resolve(db)};
    r.onerror=()=>reject(r.error);
  });
}
async function allGlasses(){
  if(!db) await openDB();
  return new Promise((res,rej)=>{const r=db.transaction(STORE,"readonly").objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});
}
async function addGlass(g){
  if(!db) await openDB();
  return new Promise((res,rej)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).add(g);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
}
async function delGlass(id){
  return new Promise((res,rej)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
}
function fileData(file){return new Promise(res=>{if(!file)return res("");const rd=new FileReader();rd.onload=()=>res(rd.result);rd.onerror=()=>res("");rd.readAsDataURL(file)})}

function show(section){
  ["home","customer","admin"].forEach(x=>$(x).classList.toggle("hidden",x!==section));
}
$("customerBtn").onclick=()=>{show("customer");loadSuggestions()};
$("adminBtn").onclick=()=>show("admin");
$("backHome").onclick=()=>{if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}show("home")};

$("startCamera").onclick=async()=>{
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
    $("camera").srcObject=stream;
  }catch(e){alert("دسترسی دوربین ممکن نشد. مجوز دوربین مرورگر را بررسی کنید.")};
};
$("takePhoto").onclick=()=>{
  const v=$("camera"), c=$("canvas");
  if(!v.videoWidth){alert("ابتدا دوربین را فعال کنید.");return}
  c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);
  $("facePreview").src=c.toDataURL("image/jpeg",0.85);$("facePreview").classList.remove("hidden");
};

$("loginAdmin").onclick=()=>{
  if($("adminPass").value==="1234"){ $("adminPanel").classList.remove("hidden"); msg($("loginMsg"),"ورود موفق بود."); renderCatalog();}
  else msg($("loginMsg"),"رمز مدیریت صحیح نیست.",true);
};
$("logoutAdmin").onclick=()=>{$("adminPanel").classList.add("hidden");$("adminPass").value=""};

$("saveGlass").onclick=async()=>{
  try{
    const model=$("gModel").value.trim();
    if(!model){msg($("saveMsg"),"شماره/مدل عینک را وارد کنید.",true);return}
    const g={
      model,brand:$("gBrand").value.trim(),color:$("gColor").value.trim(),
      price:Number($("gPrice").value||0),stock:Number($("gStock").value||0),
      dimensions:{width:Number($("gWidth").value||0),lens:Number($("gLens").value||0),bridge:Number($("gBridge").value||0),temple:Number($("gTemple").value||0)},
      front:await fileData($("gFront").files[0]),photo45:await fileData($("g45").files[0]),side:await fileData($("gSide").files[0]),
      createdAt:Date.now()
    };
    await addGlass(g);
    msg($("saveMsg"),"عینک با موفقیت ثبت شد.");
    ["gModel","gBrand","gColor","gPrice","gStock","gWidth","gLens","gBridge","gTemple"].forEach(id=>$(id).value="");
    ["gFront","g45","gSide"].forEach(id=>$(id).value="");
    renderCatalog();
  }catch(e){console.error(e);msg($("saveMsg"),"ثبت عینک انجام نشد: "+(e.message||e),true)}
};

async function renderCatalog(){
  const q=($("search").value||"").toLowerCase();
  const items=(await allGlasses()).filter(g=>(g.model+" "+g.brand).toLowerCase().includes(q));
  $("catalog").innerHTML=items.length?items.map(g=>`
    <div class="glass">
      <b>${g.model}</b> — ${g.brand||"بدون برند"} — ${g.color||"بدون رنگ"}<br>
      قیمت: ${g.price||0} | موجودی: ${g.stock||0}
      <div class="grid" style="margin-top:8px">
        ${g.front?`<img class="thumb" src="${g.front}">`:""}
        ${g.photo45?`<img class="thumb" src="${g.photo45}">`:""}
        ${g.side?`<img class="thumb" src="${g.side}">`:""}
      </div>
      <button class="danger" onclick="removeGlass(${g.id})" style="margin-top:8px">حذف</button>
    </div>`).join(""):"هنوز عینکی ثبت نشده است.";
}
window.removeGlass=async id=>{if(confirm("این عینک حذف شود؟")){await delGlass(id);renderCatalog();loadSuggestions()}};
$("search").oninput=renderCatalog;

async function loadSuggestions(){
  const items=(await allGlasses()).filter(g=>Number(g.stock)>0).slice(0,5);
  $("suggestions").innerHTML=items.length?items.map(g=>`
    <div class="glass"><b>${g.model}</b><br>${g.brand||""}<br>${g.color||""}${g.front?`<img class="thumb" src="${g.front}" style="margin-top:6px">`:""}</div>`).join("")
    :"برای نمایش پیشنهادها ابتدا عینک‌های موجود را از بخش مدیریت ثبت کنید.";
}
$("tryRequested").onclick=async()=>{
  const m=$("requestedModel").value.trim();
  const items=await allGlasses(), g=items.find(x=>x.model.toLowerCase()===m.toLowerCase());
  msg($("tryMsg"),g?`مدل ${g.model} برای مرحله پرو مجازی انتخاب شد. (موتور Virtual Try-On در مرحله بعد اضافه می‌شود.)`:"مدل موردنظر پیدا نشد.",!g);
};
openDB().catch(e=>console.error(e));