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
const enumToDays = { 0: 7, 1: 30, 2: 90, 3: 180 };

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
// 2. DOM & STATE
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

// Inject broader card styles directly to avoid CSS file compilation issues
const style = document.createElement('style');
style.innerHTML = `
  #nft-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important; /* Broader dimensions */
    gap: 24px;
  }
  .nft-card {
    display: flex;
    flex-direction: row !important; /* Changes long column layout to broad landscape format */
    align-items: center;
    padding: 16px;
    height: 140px !important;
    width: 100%;
    box-sizing: border-box;
  }
  .nft-image {
    width: 110px !important;
    height: 110px !important;
    min-width: 110px;
    border-radius: 12px;
    margin-bottom: 0px !important;
    margin-right: 16px;
  }
  .nft-details-box {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-grow: 1;
    text-align: left;
  }
  .action-btn {
    margin-top: 6px !important;
    padding: 6px 12px !important;
    font-size: 0.85rem !important;
  }
`;
document.head.appendChild(style);

// ==========================================
// 3. UI UTILITIES
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

// ==========================================
// 4. AUTH & HIGH-SPEED BATCHED SCANNING
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
      <p class="subtitle" style="color: #aaa;">Processing localized chunk multicalls</p>
    </div>`;
  
  const minTokenId = 1;
  const maxTokenIdToCheck = 333; 
  const combinedContracts = [];

  for (let i = minTokenId; i <= maxTokenIdToCheck; i++) {
    combinedContracts.push({ address: VAULT_CONTRACT, abi: vaultAbi, functionName: 'stakingLedger', args: [BigInt(i)] });
    combinedContracts.push({ address: NFT_CONTRACT, abi: nftAbi, functionName: 'ownerOf', args: [BigInt(i)] });
  }

  const ownedOrStakedIds = [];
  let softStakedTokensData = []; // Array of objects: { tokenId, unlockTimestamp }
  let earnedTidesPoints = 0.00;

  try {
    // 1. Simultaneous off-chain DB fetch
    try {
      const backendRes = await fetch(`/api/staking?walletAddress=${userAddress}`);
      if (backendRes.ok) {
        const backendData = await backendRes.json();
        earnedTidesPoints = backendData.totalPoints || 0.00;
        // Backend returns complete stake rows with createdAt and chosen duration
        softStakedTokensData = backendData.softStakedTokensDetails || [];
      }
    } catch (dbErr) {
      console.warn("Database sync error:", dbErr);
    }

    if (document.getElementById('val-tides')) {
      document.getElementById('val-tides').innerText = Number(earnedTidesPoints).toFixed(2);
    }

    // 2. 🔥 ULTRA HIGH-SPEED MULTICALL PROCESSING CHUNKS
    const chunkSize = 100; // Splits the 666 array queries down into smaller execution paths
    const totalCalls = combinedContracts.length;
    let results = [];

    const promiseBatches = [];
    for (let i = 0; i < totalCalls; i += chunkSize) {
      const batch = combinedContracts.slice(i, i + chunkSize);
      promiseBatches.push(readContracts(config, { contracts: batch }));
    }

    const batchOutputs = await Promise.all(promiseBatches);
    results = batchOutputs.flat();

    const softStakedIdsList = softStakedTokensData.map(t => t.tokenId);

    for (let i = minTokenId; i <= maxTokenIdToCheck; i++) {
      const arrayIndex = (i - minTokenId) * 2;
      const vaultRes = results[arrayIndex];
      const ownerRes = results[arrayIndex + 1];

      // On-chain hard stake evaluation
      if (vaultRes && vaultRes.status === 'success' && vaultRes.result) {
        const staker = vaultRes.result[0];
        const unlockTimestamp = Number(vaultRes.result[1]);
        if (staker && staker.toLowerCase() === userAddress.toLowerCase()) {
          ownedOrStakedIds.push({ id: i, state: "locked", unlockTimestamp: unlockTimestamp * 1000 });
          continue;
        }
      }

      // Backend soft stake calculation containing unlock tracking
      if (softStakedIdsList.includes(i)) {
        const foundMatch = softStakedTokensData.find(t => t.tokenId === i);
        ownedOrStakedIds.push({ 
          id: i, 
          state: "soft", 
          unlockTimestamp: foundMatch ? new Date(foundMatch.unlockTimestamp).getTime() : null 
        });
        continue;
      }

      // Wallet balancing check
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

  } catch (globalErr) {
    console.error("Multicall Execution Speed Failure:", globalErr);
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
      console.warn(`Meta err ID ${nft.id}`);
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

    const card = document.createElement('div');
    card.className = `nft-card ${nft.state !== 'unstaked' ? 'locked' : ''}`;
    
    let actionHTML = '';
    let statusYieldText = 'Ready to Stake';

    if (nft.state === 'unstaked') {
      actionHTML = `<button class="action-btn" onclick="openStakeModal(${nft.id})">Stake Pod 🌊</button>`;
    } else if (nft.state === 'soft') {
      statusYieldText = 'Earning Base $TIDES 🌊';
      actionHTML = `
        <div class="locked-details" style="width: 100%;">
          <span style="font-size:0.8rem; display:block;">⏳ Unlock: <span class="countdown" data-unlock="${nft.unlockTimestamp}">Calc...</span></span>
          <button class="action-btn style-withdraw" style="margin-top:4px; width: 100%; font-size:0.8rem; padding:4px; background:#fffdfa; color:#e63946; border-color:#e63946;" onclick="unstakeSoft(${nft.id})">Unstake Soft</button>
        </div>`;
    } else if (nft.state === 'locked') {
      statusYieldText = 'Multiplying Yield 🚀';
      actionHTML = `
        <div class="locked-details" style="width: 100%;">
          <span style="font-size:0.8rem; display:block;">🔒 Unlock: <span class="countdown" data-unlock="${nft.unlockTimestamp}">Calc...</span></span>
          <button class="action-btn style-withdraw" style="margin-top:4px; width: 100%; font-size:0.8rem; padding:4px; background:#fffdfa; color:#cc7a00; border-color:#cc7a00;" onclick="unstakeLocked(${nft.id})">Withdraw</button>
        </div>`;
    }

    // Notice the inner structure wraps the texts together inside a row flexbox layout cleanly
    card.innerHTML = `
      <div id="img-${nft.id}" class="nft-image ${nft.isLoadingMeta ? 'skeleton-bg' : ''}" style="background-image: url('${nft.image || ''}'); background-size: cover; background-position: center;">
        <span class="nft-rarity-badge">#${nft.id}</span>
      </div>
      <div class="nft-details-box">
        <span id="name-${nft.id}" class="nft-name ${nft.isLoadingMeta ? 'skeleton-text' : ''}" style="font-weight:700; font-size:1.1rem; color:white;">${nft.name}</span>
        <span class="nft-yield" style="font-size:0.85rem; color:#00b4d8; margin: 2px 0 6px 0;">${statusYieldText}</span>
        ${actionHTML}
      </div>
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
        el.innerText = "Unlocked!";
        el.style.color = "#2b9348";
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        
        if (days > 0) {
          el.innerText = `${days}d ${hours}h`;
        } else {
          el.innerText = `${hours}h ${mins}m`;
        }
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
    strategyInfo.innerHTML = "<strong>Soft Stake:</strong> Earn 10% base $TIDES. Keep Pod in wallet. No duration multipliers.";
    
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
        await signMessage(config, { message: `I am Soft Staking PacificPod #${currentPodToStake} to earn off-chain $TIDES.` });
        
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
