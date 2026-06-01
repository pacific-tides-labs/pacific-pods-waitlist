import { createAppKit } from '@reown/appkit'
import { mainnet } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { writeContract, readContract, readContracts, waitForTransactionReceipt, signMessage } from '@wagmi/core'

import vaultArtifact from './abis/PodStakingVault.json'; 
import nftArtifact from './abis/PacificPods.json'; 

const VAULT_CONTRACT = "0x5556b65ae9F6F724160bf71fC4846908836F07a9"; 
const NFT_CONTRACT = "0x18ad9e94291252aad72b4e46991f2cc2b2de8e80"; 

const vaultAbi = vaultArtifact.abi || vaultArtifact;
const nftAbi = nftArtifact.abi || nftArtifact;

const durationToEnum = { "7": 0, "30": 1, "90": 2, "180": 3 };

// ==========================================
// 1. REOWN APPKIT INIT
// ==========================================
const projectId = '16a626ad2200a518762ad0fc74686bdf'; 
const networks = [mainnet]; 

const wagmiAdapter = new WagmiAdapter({ projectId, networks });
const config = wagmiAdapter.wagmiConfig; 

const metadata = {
  name: 'PacificPods Staking',
  description: 'Lock your Pod. Earn the Depths.',
  url: window.location.origin, 
  icons: ['https://pacificpods.xyz/static/logo.jpeg']
};

const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  metadata,
  projectId,
  themeMode: 'light',
  features: { analytics: false, email: false, socials: [] },
  themeVariables: { '--w3m-accent': '#003b8e', '--w3m-border-radius-master': '16px' }
});

// ==========================================
// 2. DOM, STATE & PREMIUM CSS INJECTION
// ==========================================
const web3ConnectBtn = document.getElementById('web3-connect-btn');
const heroConnectBtn = document.getElementById('hero-connect-btn');
const loginFlow = document.getElementById('flow-login');
const dashboardView = document.getElementById('dashboard-view');
const nftContainer = document.getElementById('nft-container');
const stakeModal = document.getElementById('stake-modal');
const lockOptions = document.getElementById('lock-options');
const strategyInfo = document.getElementById('strategy-info');
const confirmStakeBtn = document.getElementById('confirm-stake-btn');

let userAddress = null;
let isWalletConnected = false;
let selectedLockDuration = "30"; 
let currentPodToStake = null;
let realFleet = [];
let isFetchingFleet = false; 

// 🔥 THE NEW UI CSS: Handles the 0.85 ratio, rarity badges, and clean data blocks
const style = document.createElement('style');
style.innerHTML = `
  #nft-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)) !important; 
    gap: 24px;
  }
  .nft-card {
    aspect-ratio: 0.85 / 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: auto !important;
    background: rgba(20, 25, 40, 0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px;
  }
  .nft-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .rarity-badge {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 4px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  /* Rarity Colors */
  .rarity-legendary { background: rgba(255, 215, 0, 0.15); color: #FFD700; border: 1px solid rgba(255,215,0,0.3); }
  .rarity-epic { background: rgba(153, 50, 204, 0.15); color: #DDA0DD; border: 1px solid rgba(153,50,204,0.3); }
  .rarity-rare { background: rgba(0, 191, 255, 0.15); color: #00BFFF; border: 1px solid rgba(0,191,255,0.3); }
  .rarity-uncommon { background: rgba(50, 205, 50, 0.15); color: #90EE90; border: 1px solid rgba(50,205,50,0.3); }
  .rarity-common { background: rgba(169, 169, 169, 0.15); color: #D3D3D3; border: 1px solid rgba(169,169,169,0.3); }
  
  .yield-stat {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .yield-stat-col {
    display: flex;
    flex-direction: column;
  }
  .yield-label { font-size: 0.7rem; color: #aaa; text-transform: uppercase; margin-bottom: 2px;}
  .yield-value { font-size: 0.9rem; color: #fff; font-weight: 700; }
  .yield-active { color: #00b4d8; }
`;
document.head.appendChild(style);


// ==========================================
// 3. UI UTILITIES & SYSTEM INJECTIONS
// ==========================================
window.showToast = (message, type = "info") => {
  const hub = document.getElementById('toast-hub');
  if(!hub) return;
  const toast = document.createElement('div');
  toast.className = `chunky-toast ${type}`;
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "🚨";
  toast.innerHTML = `<span style="font-size: 1.5rem;">${icon}</span> <span>${message}</span>`;
  hub.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 4000);
}

window.showTxLoader = (title, msg) => {
  if(document.getElementById('tx-loader-title')) document.getElementById('tx-loader-title').innerText = title;
  if(document.getElementById('tx-loader-msg')) document.getElementById('tx-loader-msg').innerText = msg;
  if(document.getElementById('tx-loader')) document.getElementById('tx-loader').classList.remove('hidden');
}

window.hideTxLoader = () => {
  if(document.getElementById('tx-loader')) document.getElementById('tx-loader').classList.add('hidden');
}

// Tokenomics helper logic for the frontend visually 
function getPodStats(tokenId) {
  const id = Number(tokenId);
  // Simulating rarity tiers based on Token ID ranges for UI display
  if(id <= 10) return { rarity: 'Legendary', base: 55.0 };
  if(id <= 50) return { rarity: 'Epic', base: 35.0 };
  if(id <= 120) return { rarity: 'Rare', base: 22.5 };
  if(id <= 200) return { rarity: 'Uncommon', base: 15.0 };
  return { rarity: 'Common', base: 10.0 };
}

// Injects the Tokenomics guide at the bottom of the screen
function injectTokenomicsFooter() {
  if (document.getElementById('tokenomics-footer')) return;
  const parent = document.getElementById('nft-container')?.parentElement;
  if(!parent) return;

  const footer = document.createElement('div');
  footer.id = 'tokenomics-footer';
  footer.style.cssText = "margin-top: 60px; padding: 32px; background: rgba(10, 15, 30, 0.8); border-radius: 16px; border: 1px solid rgba(0, 180, 216, 0.2); color: #ddd;";
  footer.innerHTML = `
    <h2 style="color: white; margin-bottom: 24px; font-size: 1.6rem;">🌊 The Depths: $POD Points System</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px;">
      
      <div>
        <h3 style="color: #00b4d8; margin-bottom: 12px; font-size: 1.1rem; display:flex; align-items:center; gap:8px;">💎 Rarity Base Yields</h3>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.95rem; line-height: 1.8;">
          <li><span style="display:inline-block; width:90px; color:#aaa;">Common:</span> <strong>10.0 $POD / day</strong></li>
          <li><span style="display:inline-block; width:90px; color:#90EE90;">Uncommon:</span> <strong>15.0 $POD / day</strong></li>
          <li><span style="display:inline-block; width:90px; color:#00BFFF;">Rare:</span> <strong>22.5 $POD / day</strong></li>
          <li><span style="display:inline-block; width:90px; color:#DDA0DD;">Epic:</span> <strong>35.0 $POD / day</strong></li>
          <li><span style="display:inline-block; width:90px; color:#FFD700;">Legendary:</span> <strong>50.0 - 60.0 $POD / day</strong></li>
        </ul>
      </div>

      <div>
        <h3 style="color: #e63946; margin-bottom: 12px; font-size: 1.1rem; display:flex; align-items:center; gap:8px;">⚡ Soft Staking</h3>
        <p style="font-size: 0.95rem; margin: 0; line-height: 1.6; color:#bbb;">
          Keep your Pod securely in your wallet. Earn a baseline yield of <strong>10%</strong> (Base Yield ÷ 10). 
          Instantly unstake at any time with zero lock-up penalty. Perfect for maintaining liquidity.
        </p>
      </div>

      <div>
        <h3 style="color: #cc7a00; margin-bottom: 12px; font-size: 1.1rem; display:flex; align-items:center; gap:8px;">🔒 Locked Multipliers</h3>
        <p style="font-size: 0.95rem; margin: 0 0 12px 0; line-height: 1.6; color:#bbb;">Transfer your Pod to the secure Vault to earn your full base yield <strong>PLUS</strong> massive duration multipliers:</p>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.95rem; line-height: 1.8;">
          <li><span style="display:inline-block; width:80px; color:#aaa;">7 Days:</span> <strong>1.0x Boost</strong></li>
          <li><span style="display:inline-block; width:80px; color:#aaa;">30 Days:</span> <strong>1.5x Boost</strong></li>
          <li><span style="display:inline-block; width:80px; color:#aaa;">90 Days:</span> <strong>2.0x Boost</strong></li>
          <li><span style="display:inline-block; width:80px; color:#aaa;">180 Days:</span> <strong>2.5x Boost</strong></li>
        </ul>
      </div>

    </div>
  `;
  parent.appendChild(footer);
}

// ==========================================
// 4. AUTH & HIGH-SPEED DUAL-SCAN FETCHING
// ==========================================
modal.subscribeAccount((state) => {
  isWalletConnected = state.isConnected;

  if (isWalletConnected) {
    userAddress = state.address;
    const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    
    if (web3ConnectBtn) {
      web3ConnectBtn.innerHTML = `<span>🟢 ${shortAddress}</span>`;
      web3ConnectBtn.classList.add('connected');
    }
    
    if (loginFlow) loginFlow.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');

    fetchRealFleet(); 
  } else {
    userAddress = null;
    if (web3ConnectBtn) {
      web3ConnectBtn.innerHTML = "Connect Wallet";
      web3ConnectBtn.classList.remove('connected');
    }
    if (dashboardView) dashboardView.classList.add('hidden');
    if (loginFlow) loginFlow.classList.remove('hidden');
  }
});

if (web3ConnectBtn) web3ConnectBtn.addEventListener('click', () => isWalletConnected ? modal.disconnect() : modal.open());
if (heroConnectBtn) heroConnectBtn.addEventListener('click', () => modal.open());

function resolveIPFS(url) {
  if (!url) return '';
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('ipfs://')) return cleanUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
  return cleanUrl;
}

async function fetchNFTMetadata(tokenId) {
  try {
    let uri = await readContract(config, { address: NFT_CONTRACT, abi: nftAbi, functionName: 'tokenURI', args: [BigInt(tokenId)] });
    uri = resolveIPFS(uri);
    const response = await fetch(uri, { signal: AbortSignal.timeout(5000) });
    const data = await response.json();
    return {
      image: resolveIPFS(data.image || data.image_url),
      name: data.name || `PacificPod #${tokenId}`
    };
  } catch (error) {
    return { image: 'https://pacificpods.xyz/static/logo.jpeg', name: `PacificPod #${tokenId}` };
  }
}

async function fetchRealFleet() {
  if (!userAddress || !nftContainer || isFetchingFleet) return;
  isFetchingFleet = true;

  nftContainer.innerHTML = `
    <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; width: 100%; text-align: center;">
      <div class="chunky-spinner"></div>
      <h2 style="margin-top: 20px; color: white;">Scanning the Depths...</h2>
      <p class="subtitle" style="color: #aaa;">Syncing database ledger & high-speed on-chain data</p>
    </div>`;
  
  const minTokenId = 1;
  const maxTokenIdToCheck = 333; 
  const combinedContracts = [];

  for (let i = minTokenId; i <= maxTokenIdToCheck; i++) {
    combinedContracts.push({ address: VAULT_CONTRACT, abi: vaultAbi, functionName: 'stakingLedger', args: [BigInt(i)] });
    combinedContracts.push({ address: NFT_CONTRACT, abi: nftAbi, functionName: 'ownerOf', args: [BigInt(i)] });
  }

  const ownedOrStakedIds = [];
  let rawDbStakes = [];
  let earnedPodPoints = 0.00;

  try {
    // 🔥 1. Fetch RAW off-chain database documents using Query Params
    try {
      const backendRes = await fetch(`/api/staking/raw?walletAddress=${userAddress}`);
      if (backendRes.ok) {
        rawDbStakes = await backendRes.json();
      }
    } catch (dbErr) {
      console.warn("Database sync error:", dbErr);
    }

    // FRONTEND LIVE POINTS CALCULATION
    let livePoints = 0;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    rawDbStakes.forEach(doc => {
      if (doc.status === 'ACTIVE' && doc.stake === 'SOFT') {
        const stats = getPodStats(doc.tokenId);
        const secondsStaked = Math.max(0, currentTimestamp - doc.startTime);
        const pointsPerSecond = (stats.base / 10) / 86400; // Div by 10 for Soft Stake penalty
        livePoints += secondsStaked * pointsPerSecond;
      }
      earnedPodPoints += (doc.points || 0); // Add banked points
    });
    
    earnedPodPoints += livePoints;

    if (document.getElementById('val-tides')) {
      document.getElementById('val-tides').innerText = Number(earnedPodPoints).toFixed(2);
    }

    // 2. FAST MULTICALL FETCHING
    const chunkSize = 150; 
    const promiseBatches = [];
    for (let i = 0; i < combinedContracts.length; i += chunkSize) {
      const batch = combinedContracts.slice(i, i + chunkSize);
      promiseBatches.push(readContracts(config, { contracts: batch }));
    }

    const batchOutputs = await Promise.all(promiseBatches);
    const results = batchOutputs.flat();

    for (let i = minTokenId; i <= maxTokenIdToCheck; i++) {
      const arrayIndex = (i - minTokenId) * 2;
      const vaultRes = results[arrayIndex];
      const ownerRes = results[arrayIndex + 1];

      // Check Hard Lock (Directly from Blockchain)
      if (vaultRes && vaultRes.status === 'success' && vaultRes.result) {
        const staker = vaultRes.result[0];
        const unlockTimestampSeconds = Number(vaultRes.result[1]);
        if (staker && staker.toLowerCase() === userAddress.toLowerCase()) {
          ownedOrStakedIds.push({ id: i, state: "locked", unlockTimestamp: unlockTimestampSeconds * 1000 });
          continue;
        }
      }

      // Check Soft Lock (Calculated on the Frontend from Raw DB)
      const softStakeDoc = rawDbStakes.find(doc => doc.tokenId === i && doc.stake === 'SOFT' && doc.status === 'ACTIVE');
      if (softStakeDoc) {
        const durationSeconds = softStakeDoc.duration * 86400;
        const unlockTimestampMs = (softStakeDoc.startTime + durationSeconds) * 1000;
        
        ownedOrStakedIds.push({ 
            id: i, 
            state: "soft", 
            unlockTimestamp: unlockTimestampMs 
        });
        continue;
      }

      // Check Wallet Unstaked
      if (ownerRes && ownerRes.status === 'success' && ownerRes.result) {
        const owner = ownerRes.result;
        if (owner && owner.toLowerCase() === userAddress.toLowerCase()) {
          ownedOrStakedIds.push({ id: i, state: "unstaked", unlockTimestamp: null });
        }
      }
    }

    realFleet = ownedOrStakedIds.map(item => ({
      ...item,
      image: '', 
      name: `Loading...`,
      isLoadingMeta: true
    }));

    isFetchingFleet = false;
    renderFleet(); 
    hydrateMetadata();
    injectTokenomicsFooter(); // Show the Tokenomics Guide!

  } catch (globalErr) {
    console.error("Multicall/Sync Full Scan Error:", globalErr);
    isFetchingFleet = false;
  }
}

async function hydrateMetadata() {
  realFleet.forEach(async (nft) => {
    if (!nft.isLoadingMeta) return;
    try {
      const meta = await fetchNFTMetadata(nft.id);
      nft.image = meta.image;
      nft.name = meta.name;
      nft.isLoadingMeta = false;

      const imgEl = document.getElementById(`img-${nft.id}`);
      const nameEl = document.getElementById(`name-${nft.id}`);
      
      if (imgEl) {
        imgEl.style.backgroundImage = `url('${nft.image}')`;
        imgEl.classList.remove('skeleton-bg');
      }
      if (nameEl) {
        nameEl.innerText = nft.name;
        nameEl.classList.remove('skeleton-text');
      }
    } catch(e) {
      console.warn(`Failed loading meta for ID ${nft.id}`);
    }
  });
}

function renderFleet() {
  if (!nftContainer) return;
  nftContainer.innerHTML = ''; 
  let totalStaked = 0;

  if (realFleet.length === 0) {
    nftContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 40px;"><h2 style="color:#aaa;">No PacificPods Found</h2></div>';
    if (document.getElementById('val-staked')) document.getElementById('val-staked').innerText = "0";
    return;
  }

  realFleet.forEach(nft => {
    if (nft.state !== 'unstaked') totalStaked++;

    const stats = getPodStats(nft.id);
    const card = document.createElement('div');
    card.className = `nft-card ${nft.state !== 'unstaked' ? 'locked' : ''}`;
    
    let actionHTML = '';
    let statusText = 'Ready to Stake';
    let currentYield = `${stats.base} $POD`; // Base for Unstaked display

    if (nft.state === 'unstaked') {
      actionHTML = `<button class="action-btn" onclick="openStakeModal(${nft.id})">Stake Pod 🌊</button>`;
    } else if (nft.state === 'soft') {
      statusText = 'Earning Soft $POD ⚡';
      currentYield = `${(stats.base / 10).toFixed(1)} $POD`; // 10% penalty math
      actionHTML = `
        <div class="locked-details" style="padding:0; background:none; border:none; margin-top:4px;">
          <span style="font-size:0.8rem; display:block; margin-bottom:8px;">⚡ Unlock in <span class="countdown" data-unlock="${nft.unlockTimestamp}">Calc...</span></span>
          <button class="action-btn style-withdraw" style="width: 100%; font-size:0.9rem; background:#fffdfa; color:#e63946; border-color:#e63946; box-shadow: 0 4px 0px #e63946;" onclick="unstakeSoft(${nft.id})">Unstake Soft</button>
        </div>`;
    } else if (nft.state === 'locked') {
      statusText = 'Multiplying Yield 🚀';
      currentYield = `Up to ${(stats.base * 2.5).toFixed(1)} $POD`; // Show max potential
      actionHTML = `
        <div class="locked-details" style="padding:0; background:none; border:none; margin-top:4px;">
          <span style="font-size:0.8rem; display:block; margin-bottom:8px;">🔒 Unlocks in <span class="countdown" data-unlock="${nft.unlockTimestamp}">Calc...</span></span>
          <button class="action-btn style-withdraw" style="width: 100%; font-size:0.9rem; background:#fffdfa; color:#cc7a00; border-color:#cc7a00; box-shadow: 0 4px 0px #cc7a00;" onclick="unstakeLocked(${nft.id})">Withdraw</button>
        </div>`;
    }

    card.innerHTML = `
      <div id="img-${nft.id}" class="nft-image ${nft.isLoadingMeta ? 'skeleton-bg' : ''}" style="background-image: url('${nft.image || ''}'); background-size: cover; background-position: center; border-radius: 12px; height: 160px; margin-bottom: 12px; position: relative;">
        <span style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; color: white; font-weight: bold;">#${nft.id}</span>
      </div>
      
      <div class="nft-header">
        <span id="name-${nft.id}" class="nft-name ${nft.isLoadingMeta ? 'skeleton-text' : ''}" style="font-weight:700; font-size:1.05rem; color:white;">${nft.name}</span>
        <span class="rarity-badge rarity-${stats.rarity.toLowerCase()}">${stats.rarity}</span>
      </div>

      <div class="yield-stat">
        <div class="yield-stat-col">
          <span class="yield-label">Base Rate</span>
          <span class="yield-value">${stats.base} $POD</span>
        </div>
        <div class="yield-stat-col" style="text-align: right;">
          <span class="yield-label">Current Yield</span>
          <span class="yield-value yield-active">${currentYield}</span>
        </div>
      </div>
      
      <span class="nft-yield" style="font-size:0.85rem; color:#00b4d8; margin-bottom: 8px; display:block; text-align: center;">${statusText}</span>
      ${actionHTML}
    `;
    nftContainer.appendChild(card);
  });

  if (document.getElementById('val-staked')) {
    document.getElementById('val-staked').innerText = totalStaked;
  }
  
  clearInterval(window.timerInterval);
  startCountdownTimers();
}

function startCountdownTimers() {
  window.timerInterval = setInterval(() => {
    document.querySelectorAll('.countdown').forEach(el => {
      const unlockTime = parseInt(el.getAttribute('data-unlock'));
      if (!unlockTime || isNaN(unlockTime)) {
        el.innerText = "--";
        return;
      }

      const diff = unlockTime - Date.now();
      
      if (diff <= 0) {
        el.innerText = "Ready!";
        el.style.color = "#2b9348";
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        el.innerText = `${days}d ${hours}h`;
      }
    });
  }, 1000); 
}

// ==========================================
// 5. TX EXECUTION ENGINE + BACKEND LINKING
// ==========================================
window.openStakeModal = (id) => {
  currentPodToStake = id;
  if (document.getElementById('modal-title')) {
    document.getElementById('modal-title').innerText = `Stake POD #${id}`;
  }
  
  selectStakeType('soft');
  
  const thirtyDayTile = document.querySelector('.lock-tile[onclick*="(30"]');
  if (thirtyDayTile) {
    selectLockDuration(30, thirtyDayTile); 
  }

  if (document.getElementById('stake-modal')) document.getElementById('stake-modal').classList.remove('hidden');
}

window.selectStakeType = (type) => {
  const tabSoft = document.getElementById('tab-soft');
  const tabLocked = document.getElementById('tab-locked');
  const lockOptions = document.getElementById('lock-options');
  const strategyInfo = document.getElementById('strategy-info');
  
  if (!tabSoft || !tabLocked || !lockOptions || !strategyInfo) return;

  const boostSpans = document.querySelectorAll('.lock-boost');
  lockOptions.classList.remove('hidden'); 

  if (type === 'soft') {
    tabSoft.classList.add('active'); tabLocked.classList.remove('active');
    
    strategyInfo.innerHTML = "<strong>Soft Stake:</strong> Earn 10% base $POD. Keep Pod in wallet. No duration multipliers.";
    
    if(boostSpans.length === 4) {
      boostSpans[0].innerText = "10% Yield";
      boostSpans[1].innerText = "10% Yield";
      boostSpans[2].innerText = "10% Yield";
      boostSpans[3].innerText = "10% Yield";
    }

  } else {
    tabLocked.classList.add('active'); tabSoft.classList.remove('active');
    
    strategyInfo.innerHTML = "<strong>Locked Stake:</strong> Transfer asset to vault to earn full base points + massive duration multipliers.";
    
    if(boostSpans.length === 4) {
      boostSpans[0].innerText = "1.0x Boost";
      boostSpans[1].innerText = "1.5x Boost";
      boostSpans[2].innerText = "2.0x Boost";
      boostSpans[3].innerText = "2.5x Boost";
    }
  }
}

window.selectLockDuration = (days, element) => {
  if (durationToEnum[String(days)] === undefined) return;
  selectedLockDuration = String(days);
  document.querySelectorAll('.lock-tile').forEach(tile => tile.classList.remove('active-tile'));
  if (element) element.classList.add('active-tile');
}

if (confirmStakeBtn) {
  confirmStakeBtn.addEventListener('click', async () => {
    const isSoft = document.getElementById('tab-soft').classList.contains('active');
    window.closeModal('stake-modal');

    try {
      if (isSoft) {
        window.showTxLoader("Soft Staking", "Please sign the message in your wallet.");
        
        await signMessage(config, { message: `I am Soft Staking PacificPod #${currentPodToStake} to earn off-chain $POD.` });
        
        window.showTxLoader("Recording State", "Logging soft stake into database...");

        const backendResponse = await fetch("/api/staking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: userAddress,
            tokenId: Number(currentPodToStake),
            duration: Number(selectedLockDuration),
            stake: "SOFT"
          })
        });

        const backendData = await backendResponse.json();
        if (!backendResponse.ok) throw new Error(backendData.error || "Backend recording rejected.");

        window.hideTxLoader();
        window.showToast(`Soft Staking active for Pod #${currentPodToStake}!`, "success");
      } else {
        let isApproved = false;
        try {
           isApproved = await readContract(config, { address: NFT_CONTRACT, abi: nftAbi, functionName: 'isApprovedForAll', args: [userAddress, VAULT_CONTRACT] });
        } catch (e) {
           console.warn("Could not verify contract approvals.");
        }

        if (!isApproved) {
          window.showTxLoader("Collection Approval", "Approve the Vault to securely handle your Pods.");
          const txHashApprove = await writeContract(config, { address: NFT_CONTRACT, abi: nftAbi, functionName: 'setApprovalForAll', args: [VAULT_CONTRACT, true] });
          await waitForTransactionReceipt(config, { hash: txHashApprove });
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        window.showTxLoader("Locking Asset", "Confirm the staking transaction.");
        const enumIndex = durationToEnum[selectedLockDuration]; 
        const txHashLock = await writeContract(config, { address: VAULT_CONTRACT, abi: vaultAbi, functionName: 'lock', args: [BigInt(currentPodToStake), enumIndex] });
        await waitForTransactionReceipt(config, { hash: txHashLock });
        
        window.hideTxLoader();
        window.showToast(`Pod #${currentPodToStake} Successfully Locked!`, "success");
      }
      
      realFleet = [];
      fetchRealFleet(); 

    } catch (error) {
      window.hideTxLoader();
      window.showToast(error.message || "Transaction Failed.", "error");
    } finally {
      if(document.getElementById('confirm-stake-btn')) {
        document.getElementById('confirm-stake-btn').innerHTML = "Confirm Stake 🌊";
        document.getElementById('confirm-stake-btn').disabled = false;
      }
    }
  });
}

window.unstakeSoft = async (id) => {
  try {
    window.showTxLoader("Removing Soft Stake", "Updating database configuration...");
    
    const response = await fetch("/api/staking", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: userAddress, tokenId: id })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to remove soft stake.");

    window.hideTxLoader();
    window.showToast(`Soft stake cancelled for Pod #${id}!`, "success");
    
    realFleet = [];
    fetchRealFleet(); 
  } catch(err) {
    window.hideTxLoader();
    window.showToast(err.message || "Could not complete operation.", "error");
  }
}

window.unstakeLocked = async (id) => {
  try {
    window.showTxLoader("Unstaking Pod", "Please confirm the withdrawal transaction.");
    const txHashUnlock = await writeContract(config, { address: VAULT_CONTRACT, abi: vaultAbi, functionName: 'unlock', args: [BigInt(id)] });
    await waitForTransactionReceipt(config, { hash: txHashUnlock });
    
    window.hideTxLoader();
    window.showToast(`Pod #${id} Returned to Wallet!`, "success");
    
    realFleet = [];
    fetchRealFleet(); 
  } catch (error) {
    window.hideTxLoader();
    window.showToast("Withdrawal Failed. Ensure lock time is finished.", "error");
  }
}

window.closeModal = (modalId) => {
  if (document.getElementById(modalId)) document.getElementById(modalId).classList.add('hidden');
}
