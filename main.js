// ===== Helpers =====
function emailValid(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function passwordValid(v){ return v.length >= 8 && /\d/.test(v); } // ≥8 chars & a number

const toast = document.getElementById('toast');
function showToast(msg){
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

// ===== Password eye toggle (works on login & signup) =====
document.querySelectorAll('.password-wrap').forEach(wrap => {
  const input = wrap.querySelector('input[type="password"], input[type="text"]');
  const toggle = wrap.querySelector('.pw-toggle');
  if (input && toggle){
    toggle.addEventListener('click', () => {
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      toggle.textContent = isPw ? '🙈' : '👁';
    });
  }
});

// ===== Sign Up =====
const signupForm = document.getElementById('signupForm');
if (signupForm){
  const firstEl    = document.getElementById('firstName');
  const lastEl     = document.getElementById('lastName');
  const emailEl    = document.getElementById('email');
  const pwEl       = document.getElementById('password');
  const confirmEl  = document.getElementById('confirm');
  const termsEl    = document.getElementById('terms');
  const submitBtn  = document.getElementById('submitBtn');

  const emailError   = document.getElementById('emailError');
  const pwError      = document.getElementById('passwordError');
  const confirmError = document.getElementById('confirmError');

  function syncButtonState(){
    const ok =
      firstEl.value.trim() &&
      lastEl.value.trim() &&
      emailValid(emailEl.value.trim()) &&
      passwordValid(pwEl.value) &&
      confirmEl.value === pwEl.value &&
      termsEl.checked;
    submitBtn.disabled = !ok;
  }

  // listeners
  [firstEl, lastEl].forEach(el => el.addEventListener('input', syncButtonState));

  emailEl.addEventListener('input', () => {
    emailError.textContent = !emailEl.value ? '' : (emailValid(emailEl.value) ? '' : 'Please enter a valid email.');
    syncButtonState();
  });

  pwEl.addEventListener('input', () => {
    pwError.textContent = !pwEl.value ? '' : (passwordValid(pwEl.value) ? '' : 'Min 8 chars and include a number.');
    if (confirmEl.value && confirmEl.value !== pwEl.value){
      confirmError.textContent = 'Passwords do not match.';
    } else {
      confirmError.textContent = '';
    }
    syncButtonState();
  });

  confirmEl.addEventListener('input', () => {
    confirmError.textContent = !confirmEl.value ? '' : (confirmEl.value === pwEl.value ? '' : 'Passwords do not match.');
    syncButtonState();
  });

  termsEl.addEventListener('change', syncButtonState);

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Account created! (Demo)');
    // Redirect only between auth pages:
    setTimeout(() => { window.location.href = 'login.html'; }, 700);
  });

  // init
  syncButtonState();
}

// ===== Login =====
const loginForm = document.getElementById('loginForm');
if (loginForm){
  const userEl = document.getElementById('username');
  const passEl = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');

  function syncLogin(){
    loginBtn.disabled = !(userEl.value.trim() && passEl.value);
  }
  [userEl, passEl].forEach(el => el.addEventListener('input', syncLogin));
  syncLogin();

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // mark the user as "logged in" (front-end only)
    localStorage.setItem('ft_logged_in', '1');
    showToast && showToast('Welcome back!');

    // go to dashboard after the toast
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 400);
  });
}


// ===== Forgot Password / Find Username =====
function simpleEmail(v){ return emailValid(v); }

// Reset Password form
const resetForm = document.getElementById('resetForm');
if (resetForm){
  const email = document.getElementById('fpEmail');
  const err = document.getElementById('fpEmailErr');
  const btn = document.getElementById('resetBtn');

  function sync(){
    const ok = simpleEmail(email.value.trim());
    btn.disabled = !ok;
    err.textContent = ok || !email.value ? '' : 'Please enter a valid email.';
  }
  email.addEventListener('input', sync);
  sync();

  resetForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    showToast('Reset link sent to your email. (Demo)');
    setTimeout(()=>{ window.location.href = 'login.html'; }, 900);
  });
}

// Find Username form
const findForm = document.getElementById('findForm');
if (findForm){
  const first = document.getElementById('fnFirst');
  const last = document.getElementById('fnLast');
  const email = document.getElementById('fnEmail');
  const err = document.getElementById('fnEmailErr');
  const btn = document.getElementById('findBtn');

  function sync2(){
    const ok = first.value.trim() && last.value.trim() && simpleEmail(email.value.trim());
    btn.disabled = !ok;
    err.textContent = simpleEmail(email.value.trim()) || !email.value ? '' : 'Please enter a valid email.';
  }
  [first, last, email].forEach(el => el.addEventListener('input', sync2));
  sync2();

  findForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    showToast('We’ve sent your username to your email. (Demo)');
    setTimeout(()=>{ window.location.href = 'login.html'; }, 900);
  });
}




// ===== Set Budget Goal page (no note) =====
const goalForm = document.getElementById('goalForm');
if (goalForm){
  const amtEl   = document.getElementById('goalAmount');
  const errEl   = document.getElementById('goalError');
  const saveBtn = document.getElementById('goalSave');

  function validAmount(v){
    const n = parseFloat(v);
    return !Number.isNaN(n) && n > 0;
  }
  function sync(){
    const ok = validAmount(amtEl.value);
    saveBtn.disabled = !ok;
    errEl.textContent = ok || !amtEl.value ? '' : 'Please enter a positive number.';
  }
  amtEl.addEventListener('input', sync);
  sync();

  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(amtEl.value);
    localStorage.setItem('ft_budget_goal_amount', String(amount));
    showToast && showToast('Goal saved!');
    setTimeout(() => { window.location.href = 'budget-goal.html'; }, 600);
  });
}



// Log out → back to Login
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn){
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('ft_logged_in'); // end session
    window.location.href = 'login.html';
  });
}
