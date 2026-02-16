let myChart = null;


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBaWAgyMiwifEzW_l9KmkHoFxUDFfTByuE",
  authDomain: "climb-cbf44.firebaseapp.com",
  projectId: "climb-cbf44",
  storageBucket: "climb-cbf44.firebasestorage.app",
  messagingSenderId: "421077247470",
  appId: "1:421077247470:web:2a0b2a34ae31c57179daff",
  measurementId: "G-BX3PEP8BPR"
};

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const grades = ["5c","6a","6a+","6b","6b+","6c","6c+","7a","7a+","7b","7b+","7c","7c+","8a"];
  const buttonDiv = document.getElementById("buttons");
  const logList = document.getElementById("climbLog");

  const myLogList = document.getElementById("myLog");
  const otherLogList = document.getElementById("otherLog");
  const userFilter = document.getElementById("userFilter");

  const pageSelector = document.getElementById("pageSelector");
  const logsPage = document.getElementById("logsPage");
  const leaderboardPage = document.getElementById("leaderboardPage");
  const leaderboardList = document.getElementById("leaderboardList");

  const authToggleBtn = document.getElementById("authToggleBtn");
    const authPanel = document.getElementById("authPanel");

    const locationSelect = document.getElementById("locationSelect");


authToggleBtn.addEventListener("click", () => {
  const isHidden = authPanel.style.display === "none";
  authPanel.style.display = isHidden ? "block" : "none";
});




grades.forEach(grade => {
  const btn = document.createElement("button");
  btn.textContent = grade;
  btn.onclick = () => addClimb(grade);

  const level = grade.charAt(0);

  if (level === "5") btn.style.background = "#16a34a";     // grön
  if (level === "6") btn.style.background = "#2563eb";     // blå
  if (level === "7") btn.style.background = "#7c3aed";     // lila
  if (level === "8") btn.style.background = "#dc2626";     // röd

  buttonDiv.appendChild(btn);
});


  let currentUser = localStorage.getItem("climbUser") || null;
let lastVisibleClimb = null;

pageSelector.addEventListener("change", () => {

  if (pageSelector.value === "leaderboard") {

    logsPage.style.display = "none";
    leaderboardPage.style.display = "block";

    loadLeaderboard();
    loadHardestLeaderboard(); // ← NY

  } else {

    logsPage.style.display = "block";
    leaderboardPage.style.display = "none";

  }

});

function loadLeaderboard() {
  db.collection("climbs").get().then(snapshot => {
    const counts = {};

    snapshot.forEach(doc => {
      const user = doc.data().user;
      counts[user] = (counts[user] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1]); // flest först

    leaderboardList.innerHTML = "";

    sorted.forEach(([user, count]) => {
      const li = document.createElement("li");
      li.textContent = `${user} – ${count} klättringar`;
      leaderboardList.appendChild(li);
    });
  });
}

function showCelebration() {
  const el = document.getElementById("climbCelebration");
  el.style.animation = "none";          // reset om man klickar snabbt
  void el.offsetWidth;                  // trigger reflow
  el.style.animation = "popFade 1.2s ease-out";
}


function addClimb(grade) {
  if (!currentUser) return alert("Du måste logga in först");

  const location = locationSelect.value;
  if (!location) return alert("Välj en plats först");

  const date = new Date().toLocaleDateString("sv-SE");

  db.collection("climbs").add({
    user: currentUser,
    grade,
    location,   // 🆕 NYTT FÄLT
    date,
    timestamp: Date.now()
  }).then(() => {
    showCelebration();
    loadClimbs();
    loadMyClimbs();
    loadUserList();
    loadMyChart();
  });
}


function loadClimbs() {
  db.collection("climbs")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      logList.innerHTML = "";
      lastVisibleClimb = null;

      const docs = snapshot.docs; // gör om till array

      if (docs.length > 0) {
        const first = docs[0];
        lastVisibleClimb = { id: first.id, ...first.data() };
      }

      docs.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.textContent = `${data.date} – ${data.grade} – 📍 ${data.location} (${data.user})`;
        logList.appendChild(li);
      });
    });
}


window.undoLastClimb = function () {
  if (!currentUser) return alert("Logga in först");

  db.collection("climbs")
    .where("user", "==", currentUser)
    .orderBy("timestamp", "desc")
    .limit(1)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        alert("Du har inga klättringar att ta bort");
        return;
      }

      const doc = snapshot.docs[0];

      db.collection("climbs").doc(doc.id).delete()
        .then(() => {
          loadClimbs();
          loadMyClimbs();
          loadUserList();
          loadMyChart();
        });
    });
};


loadLeaderboard();


  loadClimbs();

function updateUserStatus() {
  const status = document.getElementById("userStatus");
  status.textContent = currentUser ? `Inloggad som: ${currentUser}` : "Inte inloggad";
}

function loadUserList() {
  db.collection("users").get().then(snapshot => {
    userFilter.innerHTML = "<option value=''>Välj användare</option>";

    snapshot.forEach(doc => {
      const user = doc.id; // dokument-ID är användarnamnet

      if (user !== currentUser) {
        const opt = document.createElement("option");
        opt.value = user;
        opt.textContent = user;
        userFilter.appendChild(opt);
      }
    });
  });
}


loadUserList();

function loadMyClimbs() {
  if (!currentUser) return;

  db.collection("climbs")
    .where("user", "==", currentUser)
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      myLogList.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.textContent = `${data.date} – ${data.grade} – 📍 ${data.location}`;
        myLogList.appendChild(li);
      });
    });
}

function loadOtherClimbs(user) {
  if (!user) {
    otherLogList.innerHTML = "<li>Välj en användare ovan</li>";
    return;
  }

  db.collection("climbs")
    .where("user", "==", user)
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      otherLogList.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.textContent = `${data.date} – ${data.grade} – 📍 ${data.location}`;
        otherLogList.appendChild(li);
      });
    });
}

userFilter.addEventListener("change", () => {
  loadOtherClimbs(userFilter.value);
});



updateUserStatus();

function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) return alert("Fyll i båda fälten");

  db.collection("users").doc(username).get().then(doc => {
    if (doc.exists) {
      alert("Användarnamnet är redan taget");
    } else {
      db.collection("users").doc(username).set({ password }).then(() => {
        alert("Konto skapat!");
      });
    }
  });
}

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  db.collection("users").doc(username).get().then(doc => {
    if (!doc.exists) return alert("Användaren finns inte");

    if (doc.data().password === password) {
      currentUser = username;
      localStorage.setItem("climbUser", username);
      updateUserStatus();
      loadClimbs();
      loadMyClimbs();
      loadUserList();
      loadMyChart();
    } else {
      alert("Fel lösenord");
    }
  });
}

if (currentUser) {
  loadMyChart();   // ← DETTA SAKNAS
}

loadUserList();
loadClimbs();


function loadMyChart() {

  if (!currentUser) return;

  db.collection("climbs")
    .where("user", "==", currentUser)
    .get()
    .then(snapshot => {

      const counts = {};

      snapshot.forEach(doc => {
        const grade = doc.data().grade;
        counts[grade] = (counts[grade] || 0) + 1;
      });

      const grades = Object.keys(counts).sort();
      const values = grades.map(g => counts[g]);

      const ctx = document.getElementById("myChart").getContext("2d");

      // förstör gammal chart om den finns
      if (myChart) {
        myChart.destroy();
      }

      myChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: grades,
          datasets: [{
            label: "Antal klättringar",
            data: values,
            backgroundColor: grades.map(g => getGradeColor(g))
          }]
        },
        options: {
          plugins: {
            legend: {
              labels: {
                color: "#e5e7eb"
              }
            }
          },
          scales: {
            x: {
              ticks: { color: "#e5e7eb" }
            },
            y: {
              ticks: { color: "#e5e7eb" }
            }
          }
        }
      });

    });
}

function getGradeColor(grade) {

  const level = grade.charAt(0);

  if (level === "5") return "#16a34a";
  if (level === "6") return "#2563eb";
  if (level === "7") return "#7c3aed";
  if (level === "8") return "#dc2626";

  return "#6b7280";
}

const gradeOrder = [
  "5c",
  "6a","6a+","6b","6b+","6c","6c+",
  "7a","7a+","7b","7b+","7c","7c+",
  "8a"
];

function gradeToNumber(grade) {
  return gradeOrder.indexOf(grade);
}

function loadHardestLeaderboard() {

  db.collection("climbs").get().then(snapshot => {

    const hardest = {};

    snapshot.forEach(doc => {

      const { user, grade } = doc.data();

      if (!hardest[user] || gradeToNumber(grade) > gradeToNumber(hardest[user])) {
        hardest[user] = grade;
      }

    });

    const sorted = Object.entries(hardest)
      .sort((a, b) => gradeToNumber(b[1]) - gradeToNumber(a[1]));

    const list = document.getElementById("hardestLeaderboard");
    list.innerHTML = "";

    sorted.forEach(([user, grade]) => {

      const li = document.createElement("li");

      li.innerHTML =
        `<span style="color:${getGradeColor(grade)}; font-weight:bold;">
          ${grade}
         </span> — ${user}`;

      list.appendChild(li);

    });

  });

}
