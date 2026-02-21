import { app } from "../src/server"
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import request from "supertest";
import { IUser } from "../src/types/user";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { mongo } from "mongoose";

let mongoServer: MongoMemoryServer;

beforeAll(async (): Promise<void> =>{
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
})

afterAll(async (): Promise<void> =>{
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
})

describe("Auth Integration Test", (): void =>{
    const testPayload: IUser = { 
        email: "example@example.com",
        password: "12345678"
    }
    
    const invalidPayload: IUser = { 
        email: "invalid@invalid.com",
        password: "12345678"
    }

    const wrongPasswordPayload: IUser = { 
        email: "example@example.com", 
        password: "wrong-password-here" 
    };

    it("should register user and return status:201 and token", async(): Promise<void> =>{
        const response = await request(app)
            .post("/api/auth/register")
            .send(testPayload)
        
        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty("token");
    })

    it("should login user and return status:200 and token", async(): Promise<void> =>{
        const response = await request(app)
            .post("/api/auth/login")
            .send(testPayload)

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("token")
    })

    it("should return 401 for invalid credentials while loging-in", async(): Promise<void> =>{
        const response = await request(app)
            .post("/api/auth/login")
            .send(invalidPayload)

        expect(response.status).toBe(401)
    })

    it("should return status:200 if a user already exists", async(): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/register")
            .send(testPayload)

        expect(response.status).toBe(200)
        expect(response.body.message).toBe("Error: Invalid Email or Password.")
    })

    it("should return 401 if the email is correct but the password is wrong", async (): Promise<void> => {
        const response = await request(app)
            .post("/api/auth/login")
            .send(wrongPasswordPayload);

        expect(response.status).toBe(401);
});
})