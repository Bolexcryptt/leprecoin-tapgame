window.onload = function() {

const SUPABASE_URL = "https://faohvpsojaweitrdusix.supabase.co";
const SUPABASE_KEY = "sb_publishable_80i1uq7kOtAQk2Sn5zvvTQ_gwWsg7Gd";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Game state
let points = parseInt(localStorage.getItem("points")) || 0;
let energy = parseInt(localStorage.getItem("energy")) || 500;
let tapPower = parseInt(localStorage.getItem("tapPower")) || 1;
let passive = parseInt(localStorage.getItem("passive")) || 0;

const tapBtn = document.getElementById("tapBtn");
const leaderboardList = document.getElementById("leaderboardList");

let claimedMines = JSON.parse(localStorage.getItem("claimedMines")) || [];

// Telegram WebApp
let username = "Player";
let user_id = null;

const tg = window.Telegram?.WebApp;
if(tg?.initDataUnsafe?.user){
  username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || "Player";
  user_id = tg.initDataUnsafe.user.id;
}

// TAP
tapBtn.addEventListener("click", function(e){
  if(energy<=0){ gameMsg("No energy"); return; }
  points += tapPower;
  energy -=1;
  showFloat(e);
  if(navigator.vibrate) navigator.vibrate(10);
  save();
  update();
});

function showFloat(e){
  let float = document.createElement("div");
  float.className="tapFloat";
  float.innerText="+"+tapPower;
  let rect = tapBtn.getBoundingClientRect();
  float.style.left=(e.clientX - rect.left)+"px";
  float.style.top=(e.clientY - rect.top)+"px";
  tapBtn.appendChild(float);
  setTimeout(()=>{float.remove()},800);
}

// UPDATE
function update(){
  document.getElementById("points").innerText=points;
  document.getElementById("energy").innerText=energy;
  document.getElementById("tapPower").innerText=tapPower;
  document.getElementById("energyBar").style.width=(energy/500*100)+"%";
  for(let i=1;i<=8;i++){
    let btn = document.querySelector(`#shop .card:nth-child(${i}) button`);
    if(claimedMines.includes(i)){
      btn.innerText="Claimed";
      btn.disabled=true;
    }
  }
}

// SAVE LOCAL
function save(){
  localStorage.setItem("points",points);
  localStorage.setItem("energy",energy);
  localStorage.setItem("tapPower",tapPower);
  localStorage.setItem("passive",passive);
  localStorage.setItem("claimedMines",JSON.stringify(claimedMines));
}

// PASSIVE
setInterval(()=>{
  points+=passive;
  save();
  update();
},1000);

// ENERGY REFILL
setInterval(()=>{
  if(energy<500){ energy++; save(); update(); }
},3000);

// SHOP
window.buy=function(id){
  if(claimedMines.includes(id)){ gameMsg("Already claimed"); return; }
  let cost=[500,1500,2500,4000,6000,8000,10000,15000];
  let tap=[2,3,4,5,6,7,8,9];
  let ps=[1,2,3,4,5,6,0,7];
  if(points>=cost[id-1]){
    points -= cost[id-1];
    tapPower=tap[id-1];
    passive += ps[id-1];
    claimedMines.push(id);
    gameMsg("Upgrade purchased");
    save();
    update();
  }else{ gameMsg("Not enough points"); }
}

// PAGES
window.showPage=function(page){
  document.getElementById("home").style.display="none";
  document.getElementById("shop").style.display="none";
  document.getElementById("leaderboard").style.display="none";
  document.getElementById(page).style.display="block";
  if(page==="leaderboard") loadLeaderboard();
}

// DAILY REWARD
window.dailyReward=function(){
  let last = localStorage.getItem("daily");
  let now = Date.now();
  if(last && now-last<86400000){ gameMsg("Come back tomorrow"); return; }
  points+=50;
  localStorage.setItem("daily",now);
  gameMsg("You received 50 coins");
  save();
  update();
}

// GAME MESSAGE
function gameMsg(text){
  let box=document.getElementById("gameMessage");
  box.innerText=text;
  box.classList.add("show");
  setTimeout(()=>{box.classList.remove("show")},2000);
}

// LEADERBOARD
async function loadLeaderboard(){
  leaderboardList.innerHTML="<p>Loading leaderboard...</p>";
  try{
    let {data,error}=await supabase.from("leaderboard").select("username,score").order("score",{ascending:false}).limit(20);
    if(error){ throw error; }
    if(data.length===0){ leaderboardList.innerHTML="<p>No scores yet</p>"; return; }
    let html="<ol>";
    data.forEach((p,index)=>{
      html+=`<li>#${index+1} ${p.username}: ${p.score}</li>`;
    });
    html+="</ol>";
    leaderboardList.innerHTML=html;
  }catch(err){
    leaderboardList.innerHTML="<p>Error loading leaderboard</p>";
    console.error("Leaderboard fetch error:",err);
  }
}

// SAVE SCORE with anti-cheat
async function saveScore(){
  if(!user_id) return;
  try{
    const { data: existing } = await supabase.from("leaderboard").select("score").eq("user_id",user_id).single();
    if(!existing || points > existing.score){
      await supabase.from("leaderboard").upsert({username,user_id,score:points},{onConflict:"user_id"});
      updateLeaderboard(); // immediately refresh leaderboard
      console.log("Score saved:",username,points);
    }
  }catch(err){
    console.error("Error saving score:",err);
  }
}

// Refresh leaderboard
async function updateLeaderboard(){
  let pageVisible = document.getElementById("leaderboard").style.display==="block";
  if(pageVisible) await loadLeaderboard();
}

// SAVE SCORE EVERY 5s and REFRESH LEADERBOARD
setInterval(()=>{ saveScore(); },5000);
setInterval(()=>{ updateLeaderboard(); },5000);

// INIT
update();
showPage("home");

}