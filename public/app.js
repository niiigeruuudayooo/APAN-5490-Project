const API_BASE = ""; // same origin, e.g. http://localhost:3000

// Store token
let token = localStorage.getItem("token");

// Register
document.getElementById("register-btn").addEventListener("click", async () => {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  console.log("Register:", data);
  alert(data.message || "Registered!");
});

// Login
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (res.ok && data.token) {
    token = data.token;
    localStorage.setItem("token", token);
    alert("Login successful!");
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("transaction-section").style.display = "block";
  } else {
    alert(data.message || "Login failed");
  }
});

// Add Transaction
document.getElementById("add-transaction-btn").addEventListener("click", async () => {
  const date = document.getElementById("trans-date").value;
  const amount = parseFloat(document.getElementById("trans-amount").value);
  const type = document.getElementById("trans-type").value;
  const category = document.getElementById("trans-category").value;
  const note = document.getElementById("trans-note").value;

  const res = await fetch(`${API_BASE}/api/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ date, amount, type, category, note })
  });
  const data = await res.json();
  console.log("Add Transaction:", data);
  alert(data.message || "Transaction added!");
});

// Load Transactions
document.getElementById("load-transactions-btn").addEventListener("click", async () => {
  const res = await fetch(`${API_BASE}/api/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  const list = document.getElementById("transaction-list");
  list.innerHTML = "";
  data.forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.date.slice(0,10)} | ${t.type} | $${t.amount} | ${t.category} | ${t.note}`;
    list.appendChild(li);
  });
});
