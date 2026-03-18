let totalScore = 0;
const scoreDisplay = document.getElementById('score');

let taskFollow = false;
let taskLike = false;

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('referral');
  if (refCode) {
    const refInput = document.getElementById('referral');
    if (refInput) refInput.value = refCode;
  }

  if (typeof loggedInUser !== 'undefined' && loggedInUser && loggedInUser !== null) {
    showSuccessData(loggedInUser, true);
  }
};

function switchAuth(mode) {
  const flowReg = document.getElementById('flow-register');
  const flowLog = document.getElementById('flow-login');
  const tabReg = document.getElementById('tab-reg');
  const tabLog = document.getElementById('tab-log');
  
  const errorLogin = document.getElementById('error-login');
  if (errorLogin) errorLogin.style.display = 'none';

  if (mode === 'register') {
    flowReg.classList.remove('hidden');
    flowLog.classList.add('hidden');
    tabReg.classList.add('active');
    tabLog.classList.remove('active');
  } else {
    flowReg.classList.add('hidden');
    flowLog.classList.remove('hidden');
    tabReg.classList.remove('active');
    tabLog.classList.add('active');
  }
}

function processLogin() {
  const wallet = document.getElementById('login-wallet').value.trim();
  const errorMsg = document.getElementById('error-login');
  const btn = document.getElementById('login-btn');

  if (!wallet.startsWith('0x') || wallet.length !== 42) {
    errorMsg.innerText = "Please enter a valid 42-character wallet address.";
    errorMsg.style.display = 'block';
    return;
  }

  errorMsg.style.display = 'none';
  btn.innerText = 'Searching...';
  btn.disabled = true;

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: wallet })
  })
  .then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Backend rejected login");
    return data;
  })
  .then(data => {
    if (data.success) {
      showSuccessData(data.user, true);
    } else {
      throw new Error("Wallet not found. Please register.");
    }
  })
  .catch(error => {
    console.error('Login Error:', error);
    errorMsg.innerText = error.message || "Network error. Try again.";
    errorMsg.style.display = 'block';
    btn.innerText = 'Access Pass 🔑';
    btn.disabled = false;
  });
}

function markTask(task) {
  if (task === 'follow') {
    taskFollow = true;
    const btn = document.getElementById('btn-follow');
    btn.classList.add('success-task');
    btn.innerText = '✅ Followed';
  } else if (task === 'like') {
    taskLike = true;
    const btn = document.getElementById('btn-like');
    btn.classList.add('success-task');
    btn.innerText = '✅ Liked';
  } else if (task === 'repost') {
    taskLike = true;
    const btn = document.getElementById('btn-repost');
    btn.classList.add('success-task');
    btn.innerText = '✅ Quoted';
  }
}

function nextStep(currentStep) {
  if (currentStep > 0) {
    const errorMsg = document.getElementById(`error-${currentStep}`);
    if(errorMsg) errorMsg.style.display = 'none';

    if (currentStep === 1) {
      const email = document.getElementById('email').value.trim();
      if (!email.includes('@') || email.length < 5) {
        errorMsg.style.display = 'block';
        return;
      }
    } else if (currentStep === 2) {
      const wallet = document.getElementById('wallet').value.trim();
      if (!wallet.startsWith('0x') || wallet.length !== 42) { 
        errorMsg.innerText = "Please enter a valid 42-character wallet address.";
        errorMsg.style.display = 'block';
        return;
      }
    } else if (currentStep === 3) {
    } else if (currentStep === 4) {
      const tweetLink = document.getElementById('tweetLink').value.trim();
      if ((!tweetLink.includes('x.com/') && !tweetLink.includes('twitter.com/')) || !taskFollow || !taskLike) {
        errorMsg.innerText = "Please enter a valid link and complete all social tasks.";
        errorMsg.style.display = 'block';
        return;
      }
      
      const submitBtn = document.getElementById('submit-btn');
      submitBtn.innerText = 'Submitting...';
      submitBtn.disabled = true;

      const payload = {
        email: document.getElementById('email').value.trim(),
        walletAddress: document.getElementById('wallet').value.trim(),
        xUsername: tweetLink,
      };

      const refVal = document.getElementById('referral').value.trim();
      if (refVal !== '') {
        payload.referral = refVal;
      }

      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Registration failed"); 
        console.log(data)
        return data;
      })
      .then(data => {
        if (data.success) {
          showSuccessData(data.user, false);
          document.getElementById('step-4').classList.add('hidden');
        } else {
          throw new Error(data.message || "Failed to join waitlist. Try again.");
        }
      })
      .catch(error => {
        console.error('Register Error:', error);
        errorMsg.innerText = error.message || "Network error. Please try again.";
        errorMsg.style.display = 'block';
        submitBtn.innerText = 'Verify & Join Waitlist 🚀';
        submitBtn.disabled = false;
      });

      return;
    }
  }

  transitionToStep(currentStep, currentStep + 1);
}

function showSuccessData(userData, isLogin) {
  const authTabs = document.getElementById('auth-tabs');
  const flowReg = document.getElementById('flow-register');
  const flowLog = document.getElementById('flow-login');
  
  if (authTabs) authTabs.classList.add('hidden');
  if (flowReg) flowReg.classList.add('hidden');
  if (flowLog) flowLog.classList.add('hidden');
  
  document.getElementById('disp-email').innerText = userData.email;
  document.getElementById('disp-wallet').innerText = userData.walletAddress;
  document.getElementById('disp-referral').innerText = userData.referral;
  document.getElementById('disp-tweet').innerText = userData.xUsername;
  
  const dispScore = document.getElementById('disp-score');
  if(dispScore) dispScore.innerText = userData.score;

  document.getElementById('step-5').classList.remove('hidden');
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

  if (isLogin) {
    switchTab('pass');
    document.querySelector("#tab-video").remove()
    document.querySelector(".tabs").remove()
  } else {
    const video = document.querySelector('video');
    if (video) {
      video.autoplay = true;
      video.play();
      setTimeout(() => { switchTab('pass'); }, 8000);
    }
  }
}

function transitionToStep(current, next) {
  document.getElementById(`step-${current}`).classList.add('hidden');
  document.getElementById(`step-${next}`).classList.remove('hidden');

  if(current === 3){
    window.scrollTo({ top: 180, behavior: "smooth"})
  } else {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
}

function prevStep(currentStep) {
  const errorMsg = document.getElementById(`error-${currentStep}`);
  if(errorMsg) errorMsg.style.display = 'none';
  
  document.getElementById(`step-${currentStep}`).classList.add('hidden');
  document.getElementById(`step-${currentStep - 1}`).classList.remove('hidden');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchTab(tab) {
  document.getElementById('tab-video').classList.add('hidden');
  document.getElementById('tab-pass').classList.add('hidden');
  document.getElementById('tab-btn-video').classList.remove('active');
  document.getElementById('tab-btn-pass').classList.remove('active');

  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-btn-${tab}`).classList.add('active');
}

const bgContainer = document.getElementById('ocean-bg');

function createBubble() {
  if (!bgContainer) return;
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  
  const size = Math.random() * 50 + 20; 
  const left = Math.random() * 100; 
  const duration = Math.random() * 8 + 6; 

  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;
  bubble.style.left = `${left}%`;
  bubble.style.animation = `floatUp ${duration}s ease-in forwards`;

  bubble.addEventListener('mousedown', (e) => {
    const rect = bubble.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    let points = 10;
    if (size < 35) points = 30;
    if (size < 25) points = 50;

    totalScore += points;
    if (scoreDisplay) scoreDisplay.innerText = totalScore;

    bubble.remove(); 
    createSplash(x, y, size); 
    showFloatingScore(points, x, y);
  });

  bgContainer.appendChild(bubble);

  setTimeout(() => {
    if (bgContainer.contains(bubble)) bubble.remove();
  }, duration * 1000);
}

function createSplash(x, y, bubbleSize) {
  const dropCount = Math.floor(Math.random() * 3) + 6;
  for (let i = 0; i < dropCount; i++) {
    const drop = document.createElement('div');
    drop.classList.add('splash-drop');
    
    const dropSize = Math.random() * (bubbleSize * 0.2) + 4;
    drop.style.width = `${dropSize}px`;
    drop.style.height = `${dropSize}px`;
    drop.style.left = `${x}px`;
    drop.style.top = `${y}px`;

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 60 + 30; 
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    drop.style.setProperty('--tx', `${tx}px`);
    drop.style.setProperty('--ty', `${ty}px`);

    document.body.appendChild(drop);
    setTimeout(() => drop.remove(), 300);
  }
}

function showFloatingScore(points, x, y) {
  const scoreEl = document.createElement('div');
  scoreEl.classList.add('floating-score');
  scoreEl.innerText = `+${points}`;
  scoreEl.style.left = `${x - 20}px`; 
  scoreEl.style.top = `${y - 20}px`;
  document.body.appendChild(scoreEl);
  setTimeout(() => { scoreEl.remove(); }, 1000);
}

function copyReferral() {
  const refText = `https://pacificpod.xyz/?referral=${document.getElementById('disp-referral').innerText}`;
  
  if (refText && refText !== 'None' && refText !== 'N/A') {
    navigator.clipboard.writeText(refText).then(() => {
      const copyBtn = document.getElementById('copy-btn');
      copyBtn.innerText = '✅ Copied!';
      
      setTimeout(() => { 
        copyBtn.innerText = '📋 Copy'; 
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
}

function shareToX() {
  const refText = document.getElementById('disp-referral').innerText;
  let tweetText = `Dont miss this ALPHA!🚨%0A%0ALocked in for @PacificPod98082%0A%0AJust secured my spot 🌊%0A%0ADon't miss the wave.%0A%0AGet on the waitlist early:%0Ahttps://pacificpod.xyz/?referral=${refText}`;

  const siteUrl = window.location.origin; 
  const xUrl = `https://x.com/intent/tweet?text=${tweetText}&url=https://x.com/PacificPod98082/status/2034329293799538997 `;
  
  window.open(xUrl, '_blank');
}

setInterval(createBubble, 600);

