const fs = require("node:fs");
const { connectDB } = require("../config/db.config");
const mongoose = require("mongoose");
const { AllocationModel } = require("../models/allocation.schema");

(async ()=>{
    connectDB();
})();



async function run(FILE_PATH: string, CAMPAIGN_NAME: string, MINT_TYPE: string) {
  try {

    // 2️⃣ Read file
    const data = fs.readFileSync(FILE_PATH, "utf-8");

    // 3️⃣ Clean + split lines
    const lines = data
      .split("\n")
      .map((l:any) => l.trim().toLowerCase())
      .filter(Boolean);

    // 4️⃣ Count occurrences
    const counts: Record<string, number> = {};

    for (const addr of lines) {
      counts[addr] = (counts[addr] || 0) + 1;
    }

    // 5️⃣ Build bulk operations
    const ops = Object.entries(counts).flatMap(([walletAddress, amount]) => {
      const normalized = walletAddress.toLowerCase();

      return [
        // CASE 1: update existing campaign
        {
          updateOne: {
            filter: {
              walletAddress: normalized,
              "campaigns.name": CAMPAIGN_NAME,
              "campaigns.mint": MINT_TYPE
            },
            update: {
              $inc: {
                "campaigns.$.amount": amount
              }
            }
          }
        },

        // CASE 2: insert campaign if missing (or wallet missing)
        {
          updateOne: {
            filter: {
              walletAddress: normalized,
              campaigns: {
                $not: {
                  $elemMatch: {
                    name: CAMPAIGN_NAME,
                    mint: MINT_TYPE
                  }
                }
              }
            },
            update: {
              $push: {
                campaigns: {
                  name: CAMPAIGN_NAME,
                  mint: MINT_TYPE,
                  amount
                }
              }
            },
            upsert: true
          }
        }
      ];
    });

    // 6️⃣ Execute bulk write
    const result = await AllocationModel.bulkWrite(ops);

    console.log("Bulk write completed:", result);
  } catch (err) {
    console.error("Error:", err);
  }
}

run("./data/collabs-gtd.txt", "collaborations", "gtd");
run("./data/collabs-fcfs.txt", "collaborations", "fcfs");
run("./data/discord-gtd.txt", "discord", "gtd");
run("./data/discord-fcfs.txt", "discord", "fcfs");
run("./data/pacifica-eco.txt", "pacificacampaign", "gtd");
run("./data/tides-bot.txt", "pacifictidebot", "gtd")