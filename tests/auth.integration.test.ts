import { app } from "../src/server";
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import request from "supertest";
import mongoose from "mongoose";

beforeAll(async (): Promise<void> => {
    const uri = "mongodb://localhost:27017/PacificPodsWhitelist_Test";
    await mongoose.connect(uri);
});

afterAll(async (): Promise<void> => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Waitlist Auth Integration Test", (): void => {
    const validWallet1 = "0x1111111111111111111111111111111111111111";
    const validWallet2 = "0x2222222222222222222222222222222222222222";
    const unregisteredWallet = "0x0000000000000000000000000000000000000000";

    const baseRegisterPayload = { 
        email: "dolphin1@ocean.com",
        walletAddress: validWallet1,
        xUsername: "https://x.com/pacificpods/status/111"
    };
    
    const invalidZodPayload = { 
        email: "not-an-email",
        walletAddress: "0xTooShort",
        xUsername: "https://x.com/tweet"
    };

    const missingFieldsPayload = { 
        email: "dolphin2@ocean.com"
    };

    it("should register a new user without a referral code and return 201", async (): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/register")
            .send(baseRegisterPayload);
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.headers['set-cookie']).toBeDefined();
    });

    it("should return 400 when required fields are missing from registration payload", async (): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/register")
            .send(missingFieldsPayload);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Bad Request");
    });

    it("should return 400 when Zod schema validation fails for invalid data types", async (): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/register")
            .send(invalidZodPayload);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Bad Request");
    });

    it("should return 409 or appropriate error for duplicate registration", async (): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/register")
            .send(baseRegisterPayload);

        expect(response.status).toBeGreaterThanOrEqual(400); 
        expect(response.body.success).toBeFalsy(); 
    });

    it("should return 404 or appropriate error when a provided referral code does not exist", async (): Promise<void> => {
        const payloadWithBadReferral = {
            email: "dolphin3@ocean.com",
            walletAddress: validWallet2,
            xUsername: "https://x.com/pacificpods/status/222",
            referral: "INVALID-REF-999"
        };

        const response = await request(app)
            .post("/api/auth/register")
            .send(payloadWithBadReferral);

        expect([400, 404]).toContain(response.status);
        expect(response.body.success).toBeFalsy(); 
    });

    it("should login an existing user and return 200 with user data", async (): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ walletAddress: validWallet1 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user.walletAddress).toBe(validWallet1);
        expect(response.headers['set-cookie']).toBeDefined();
    });

    it("should return 401 for an unregistered wallet during login", async (): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ walletAddress: unregisteredWallet });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("error", "Invalid Credentials");
    });

    it("should return 400 when wallet is completely missing from login payload", async (): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Invalid Request Format");
    });

    it("should return 200 and render index with flow-register when accessing root without a token", async (): Promise<void> => {
        const response = await request(app).get("/"); 
        
        expect(response.status).toBe(200);
        expect(response.text).toContain('id="flow-register"'); 
    });
});