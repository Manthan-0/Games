// NEON THRILL SLOTS 
const symbols = [
    "💸","💸","💸","💸","💸",
    "🎈","🎈","🎈","🎈",
    "⭐","⭐",
    "🪙"
];

const bet_option = [5, 10, 25, 50, 100];
let betIndex = 1;

let balance = Number(localStorage.getItem("slotBalance")) || 1000;
let lastWin = 0;
let isSpinning = false;

// Elements
const r1            = document.getElementById("r1");
const r2            = document.getElementById("r2");
const r3            = document.getElementById("r3");
const balanceEl     = document.getElementById("balance");
const lastWinEl     = document.getElementById("lastWinDisplay");
const messageEl     = document.getElementById("message");
const leverBtn      = document.getElementById("lever");
const historyPanel  = document.getElementById("history");
const lbPanel       = document.getElementById("leaderboard");
const doubleBtn     = document.getElementById("doublebut");
const betDisplay    = document.getElementById("betDisplay");
const betDown       = document.getElementById("betDown");
const betUp         = document.getElementById("betUp");
const resetBtn      = document.getElementById("resetBtn");

// Functions

function getBet() { return bet_option[betIndex]; }

function updateBalance() {
    balanceEl.textContent  = `$${balance}`;
    lastWinEl.textContent  = `$${lastWin}`;
    localStorage.setItem("slotBalance", balance);
    leverBtn.disabled = balance < getBet();
}

function setMessage(text, type = "") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
}

function addHistory(text, type = "") {
    const d = document.createElement("div");
    d.textContent = text;
    if (type === "jackpot") d.classList.add("history-jackpot");
    else if (type === "win") d.classList.add("history-win");
    historyPanel.prepend(d);
    // keep max 20 entries
    while (historyPanel.children.length > 20) {
        historyPanel.removeChild(historyPanel.lastChild);
    }
}

function updateLeaderboard() {
    let board = JSON.parse(localStorage.getItem("slotboard")) || [];
    board.push({ name: "Player", score: balance });
    board.sort((a, b) => b.score - a.score);
    board = board.slice(0, 5);
    localStorage.setItem("slotboard", JSON.stringify(board));
    lbPanel.innerHTML = "";
    board.forEach((p, i) => {
        const row = document.createElement("div");
        const medals = ["🥇","🥈","🥉","4.","5."];
        row.textContent = `${medals[i]} ${p.name}: $${p.score}`;
        lbPanel.appendChild(row);
    });
}

function randomSymbol() {
    return symbols[Math.floor(Math.random() * symbols.length)];
}

// Audio 

let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function beep(freq, duration, type = "square", vol = 0.08) {
    if (!audioCtx) return;
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playWin() {
    [600, 750, 900].forEach((f, i) => setTimeout(() => beep(f, 0.2, "sine", 0.12), i * 120));
}

function playJackpot() {
    [400,500,600,700,800,1000].forEach((f, i) => setTimeout(() => beep(f, 0.25, "sine", 0.15), i * 100));
}

function playLose() { beep(180, 0.5, "sawtooth", 0.06); }
function playSpin()  { beep(220, 0.3, "square", 0.05); }

// Jackpot Overlay 

function showJackpot(amount) {
    const ov = document.createElement("div");
    ov.className = "jackpot-overlay";
    ov.innerHTML = `
        <div class="jackpot-text-big">JACKPOT!</div>
        <div class="jackpot-sub">You won $${amount}!</div>
        <button class="jackpot-close">COLLECT 🎉</button>
    `;
    document.body.appendChild(ov);
    ov.querySelector(".jackpot-close").addEventListener("click", () => ov.remove());
}

// Reel Win Flash 

function flashReels() {
    [r1, r2, r3].forEach(r => {
        r.classList.add("win-flash");
        r.addEventListener("animationend", () => r.classList.remove("win-flash"), { once: true });
    });
}

// Spin 

function spin() {
    if (isSpinning || balance < getBet()) return;
    const bet = getBet();

    isSpinning = true;
    balance -= bet;
    lastWin = 0;
    updateBalance();
    setMessage("Spinning…");
    doubleBtn.disabled = true;
    leverBtn.disabled  = true;
    playSpin();

    const reels = [r1, r2, r3];
    reels.forEach(r => r.classList.add("spinning"));

    const results = [];

    // Stop each reel with a delay
    const stopTimes = [700, 1250, 1800];
    reels.forEach((reel, i) => {
        setTimeout(() => {
            const sym = randomSymbol();
            results.push(sym);
            reel.textContent = sym;
            reel.classList.remove("spinning");
            beep(400 + i * 100, 0.1, "sine");

            // After last reel stops, check win
            if (i === 2) {
                setTimeout(() => checkWin(results, bet), 200);
            }
        }, stopTimes[i]);
    });
}

// Check Win 

function checkWin(results, bet) {
    const [a, b, c] = results;
    let winType = "";

    if (a === b && b === c) {
        lastWin = bet * 10;
        winType = "jackpot";
        flashReels();
        playJackpot();
        setMessage(`🎉 JACKPOT! You win $${lastWin}!`, "jackpot");
        showJackpot(lastWin);
    } else if (a === b || b === c || a === c) {
        lastWin = bet * 3;
        winType = "win";
        flashReels();
        playWin();
        setMessage(`✨ You win $${lastWin}!`, "win");
    } else {
        playLose();
        setMessage("Better luck next time…", "lose");
    }

    balance += lastWin;
    updateBalance();
    addHistory(`${a} ${b} ${c}  +$${lastWin}`, winType);
    updateLeaderboard();

    isSpinning = false;
    leverBtn.disabled = balance < bet;

    if (lastWin > 0) doubleBtn.disabled = false;

    if (balance <= 0) {
        setMessage("Game Over! You're broke! Resetting…", "lose");
        setTimeout(() => { balance = 1000; updateBalance(); }, 2000);
    }
}

// Double or Nothing 

function doubleOrNothing() {
    if (lastWin === 0) return;
    const stake = lastWin;
    const won   = Math.random() < 0.5;

    if (won) {
        const prize = stake * 2;
        balance += prize;
        lastWin  = prize;
        setMessage(`🔥 Doubled! You win $${prize}!`, "jackpot");
        playWin();
    } else {
        balance -= stake;
        if (balance < 0) balance = 0;
        lastWin = 0;
        setMessage("💀 You lost your win!", "lose");
        playLose();
    }

    updateBalance();
    doubleBtn.disabled = true;
    updateLeaderboard();
}

// Bet Controls 

function updateBetDisplay() {
    betDisplay.textContent = `$${bet_option[betIndex]}`;
    betDown.disabled = betIndex === 0;
    betUp.disabled   = betIndex === bet_option.length - 1;
}

betDown.addEventListener("click", () => {
    if (betIndex > 0) { betIndex--; updateBetDisplay(); updateBalance(); }
});

betUp.addEventListener("click", () => {
    if (betIndex < bet_option.length - 1) { betIndex++; updateBetDisplay(); updateBalance(); }
});

// Reset Button

resetBtn.addEventListener("click", () => {
    if (!confirm("Reset your balance to $1000?")) return;
    balance = 1000;
    lastWin = 0;
    localStorage.removeItem("slotboard");
    updateBalance();
    updateLeaderboard();
    setMessage("Balance reset. Good luck!");
    r1.textContent = r2.textContent = r3.textContent = "❔";
    doubleBtn.disabled = true;
});

// Lever Button 

leverBtn.addEventListener("click", () => {
    initAudio();
    spin();
});

doubleBtn.addEventListener("click", () => {
    initAudio();
    doubleOrNothing();
});

// Init 

updateBetDisplay();
updateBalance();
updateLeaderboard();