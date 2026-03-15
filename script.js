window.onload = function() {

  // -------------------
  // Supabase setup
  // -------------------
  const SUPABASE_URL = "https://faohvpsojaweitrdusix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_80i1uq7kOtAQk2Sn5zvvTQ_gwWsg7Gd";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // -------------------
  // Game variables
  // -------------------
  let points = parseInt(localStorage.getItem("points")) || 0;
  let energy = parseInt(localStorage.getItem("energy")) || 500;
  let tapPower = parseInt(localStorage.getItem("tapPower")) || 1;
  let passive = parseInt(localStorage.getItem("passive")) || 0;

  const tapBtn = document.getElementById("tapBtn");
  const leaderboardList = document.getElementById("leaderboardList");

  // -------------------
  // Mines purchased tracking
  // -------------------
  let claimedMines = JSON.parse(localStorage.getItem("claimedMines")) || [];

  // -------------------
  // Telegram user info
  // -------------------
  let username = "Player";
  let user_id = null;

  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || "Player";
    user_id = tg.initDataUnsafe.user.id;
  }

  // -------------------
  // Tap function
  // -------------------
  tapBtn.addEventListener("click", function(e) {
    if (energy <= 0) {
      gameMsg("No energy");
      return;
    }
    points += tapPower;
    energy -= 1;
    showFloat(e);
    if (navigator.vibrate) navigator.vibrate(10);
    save();
    update();
  });

  // Floating +points animation
  function showFloat(e) {
    let float = document.createElement("div");
    float.className = "tapFloat";
    float.innerText = "+" + tapPower;
    let rect = tapBtn.getBoundingClientRect();
    float.style.left = (e.clientX - rect.left) + "px";
    float.style.top = (e.clientY - rect.top) + "px";
    tapBtn.appendChild(float);
    setTimeout(() => { float.remove() }, 800);
  }

  // -------------------
  // Update display
  // -------------------
  function update() {
    document.getElementById("points").innerText = points;
    document.getElementById("energy").innerText = energy;
    document.getElementById("tapPower").innerText = tapPower;
    document.getElementById("energyBar").style.width = (energy / 500 * 100) + "%";
    // Update claimed mine buttons
    for (let i = 1; i <= 8; i++) {
      let btn = document.querySelector(`#shop .card:nth-child(${i}) button`);
      if (claimedMines.includes(i)) {
        btn.innerText = "Claimed";
        btn.disabled = true;
      }
    }
  }

  // Save game locally
  function save() {
    localStorage.setItem("points", points);
    localStorage.setItem("energy", energy);
    localStorage.setItem("tapPower", tapPower);
    localStorage.setItem("passive", passive);
    localStorage.setItem("claimedMines", JSON.stringify(claimedMines));
  }

  // Passive points per second
  setInterval(() => {
    points += passive;
    save();
    update();
  }, 1000);

  // Energy refill every 3 seconds
  setInterval(() => {
    if (energy < 500) {
      energy++;
      save();
      update();
    }
  }, 3000);

  // -------------------
  // Shop
  // -------------------
  window.buy = function(id) {
    if (claimedMines.includes(id)) {
      gameMsg("Already claimed");
      return;
    }
    let cost = [500, 1500, 2500, 4000, 6000, 8000, 10000, 15000];
    let tap = [2, 3, 4, 5, 6, 7, 8, 9];
    let ps  = [1, 2, 3, 4, 5, 6, 0, 7];
    if (points >= cost[id - 1]) {
      points -= cost[id - 1];
      tapPower = tap[id - 1];
      passive += ps[id - 1];
      claimedMines.push(id);
      gameMsg("Upgrade purchased");
      save();
      update();
    } else {
      gameMsg("Not enough points");
    }
  };

  // -------------------
  // Page navigation
  // -------------------
  window.showPage = function(page) {
    document.getElementById("home").style.display = "none";
    document.getElementById("shop").style.display = "none";
    document.getElementById("leaderboard").style.display = "none";
    document.getElementById(page).style.display = "block";
    if (page === "leaderboard") loadLeaderboard();
  };

  // -------------------
  // Daily reward
  // -------------------
  window.dailyReward = function() {
    let last = localStorage.getItem("daily");
    let now = Date.now();
    if (last && now - last < 86400000) {
      gameMsg("Come back tomorrow");
      return;
    }
    points += 50;
    localStorage.setItem("daily", now);
    gameMsg("You received 50 coins");
    save();
    update();
  };

  // -------------------
  // Game message
  // -------------------
  function gameMsg(text) {
    let box = document.getElementById("gameMessage");
    box.innerText = text;
    box.classList.add("show");
    setTimeout(() => { box.classList.remove("show") }, 2000);
  }

  // -------------------
  // Leaderboard with ranks
  // -------------------
  async function loadLeaderboard() {
    leaderboardList.innerHTML = "<p>Loading leaderboard...</p>";
    let { data, error } = await supabase
      .from("leaderboard")
      .select("username, score")
      .order("score", { ascending: false })
      .limit(20);
    if (error) {
      leaderboardList.innerHTML = "<p>Error loading leaderboard</p>";
      return;
    }
    if (data.length === 0) {
      leaderboardList.innerHTML = "<p>No scores yet</p>";
      return;
    }

    let html = "<ol>";
    data.forEach((p, index) => {
      html += `<li>#${index + 1} ${p.username}: ${p.score}</li>`;
    });
    html += "</ol>";
    leaderboardList.innerHTML = html;
  }

  // -------------------
  // Save player score to Supabase (with Telegram user_id)
  // -------------------
  async function saveScore() {
    if (!user_id) return;
    // Anti-cheat: only save if points >= last saved score
    const { data: existing } = await supabase
      .from("leaderboard")
      .select("score")
      .eq("user_id", user_id)
      .single();
    if (!existing || points > existing.score) {
      await supabase
        .from("leaderboard")
        .upsert(
          { username: username, user_id: user_id, score: points },
          { onConflict: "user_id" }
        );
    }
  }

  // Save score every 30 seconds
  setInterval(() => { saveScore() }, 30000);

  // Initial load
  update();
  showPage("home");

};