# GETKINETIK — Tamper-Proof Pipeline Activation Checklist

Complete these steps in order to activate the full IPFS + Solana anchor pipeline.

---

## Step 1 — Install npm dependencies

Open a **Command Prompt** (not PowerShell) and run:

```
cd c:\Users\ericm\getkinetik
npm install @solana/web3.js bs58
```

---

## Step 2 — Generate a Bureau Wallet

This is a dedicated Solana keypair used only to sign daily anchor transactions.
Run this in Command Prompt:

```
node -e "const { Keypair } = require('@solana/web3.js'); const k = Keypair.generate(); console.log('PUBLIC KEY:', k.publicKey.toBase58()); console.log('SECRET KEY:', JSON.stringify(Array.from(k.secretKey)));"
```

Copy the **SECRET KEY** JSON array and paste it into `.env`:
```
BUREAU_WALLET_KEY=[your,secret,key,array,here]
```

Save the **PUBLIC KEY** — it is your bureau's public signing identity. Post it on your GitHub README.

---

## Step 3 — Fund the Bureau Wallet with SOL

Each Solana memo transaction costs ~0.000005 SOL.
For 1 year of daily anchoring: 365 × 0.000005 = **~0.002 SOL** (~$0.30 at current prices).

Send **0.01 SOL** to your bureau wallet public key (more than enough for years).

You can use any wallet (Phantom, etc.) or an exchange withdrawal.

---

## Step 4 — Create a web3.storage Account

1. Go to **https://web3.storage**
2. Sign up for a free account
3. Go to **Account → API Tokens → Create Token**
4. Copy the token and paste into `.env`:

```
W3S_TOKEN=your_token_here
```

---

## Step 5 — Get Your Cloudflare D1 Credentials

1. Go to **https://dash.cloudflare.com**
2. Click your account name (top right) → copy **Account ID** → paste into `.env` as `CF_ACCOUNT_ID`
3. Go to **Workers & Pages → D1** → click your database → copy **Database ID** → paste as `D1_DATABASE_ID`
4. Go to **https://dash.cloudflare.com/profile/api-tokens**
5. Click **Create Token → Custom Token**
   - Permission: `Account → D1 → Edit`
   - Click Create → copy token → paste as `D1_API_TOKEN`

---

## Step 6 — Run the D1 Migration

```
npx wrangler d1 execute getkinetik-db --file=migrations/001_tamperproof_pipeline.sql
```

This creates the `daily_anchors` table and adds IPFS columns to `grades`.

---

## Step 7 — Test on Devnet First

Temporarily change `.env`:
```
SOLANA_RPC_URL=https://api.devnet.solana.com
```

Fund your wallet on devnet (free):
```
npx solana airdrop 1 YOUR_BUREAU_WALLET_PUBLIC_KEY --url devnet
```

Run the anchor script:
```
node scripts/anchor-daily-cids.mjs
```

You should see:
```
✅ Transaction confirmed!
Signature: <tx_signature>
Explorer:  https://explorer.solana.com/tx/<sig>?cluster=devnet
```

---

## Step 8 — Switch to Mainnet

Once devnet test passes, restore mainnet RPC in `.env`:
```
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=33812505-...
```

Run again:
```
node scripts/anchor-daily-cids.mjs
```

Your first live Solana anchor is now permanent and publicly verifiable forever.

---

## Step 9 — Set Up Daily Cron

### Option A: Cloudflare Workers Cron (Recommended)
Add to `wrangler.toml`:
```toml
[triggers]
crons = ["0 23 * * *"]  # runs at 11pm UTC every day
```

### Option B: Windows Task Scheduler
- Action: `node C:\Users\ericm\getkinetik\scripts\anchor-daily-cids.mjs`
- Trigger: Daily at 11:00 PM

---

## What You Now Have When Complete

```
Grade computed
  → signed JSON bundle (Ed25519)
  → pinned to IPFS (permanent CID)
  → CID signed by bureau key
  → Daily Merkle root built
  → Merkle root anchored on Solana (permanent tx)
  → Anyone can verify any grade forever without trusting GETKINETIK
```

**This is institutional-grade, censorship-resistant, tamper-proof reputation infrastructure.**
