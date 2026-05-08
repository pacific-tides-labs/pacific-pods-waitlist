export type IAllocation = {
    walletAddress: string,
    campaigns:[{
        name: "collaborations" | "discord" | "pacifictidebot" | "pacificacampaign",
        mint: "fcfs" | "gtd",
        amount: number,
    }]
}