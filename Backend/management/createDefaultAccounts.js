import "../src/config/env.js";

import mongoose from "mongoose";

import { env } from "../src/config/env.js";
import { ROLES } from "../src/constants/roles.js";
import { User } from "../src/models/User.js";
import { hashPassword } from "../src/utils/password.js";

const DEFAULT_PASSWORD = process.env.DEFAULT_ACCOUNT_PASSWORD || "password123";

const accounts = [
  {
    id: 1,
    role: ROLES.ADMIN,
    name: "Cyber Vidya Admin",
    email: "admin@cybervidya.com",
    contactNo: "+91-9000000001",
  },
  {
    id: 2,
    role: ROLES.MANAGER,
    name: "Riya Manager",
    email: "manager@cybervidya.com",
    contactNo: "+91-9000000002",
    certification: "Security Mentor",
  },
  {
    id: 3,
    role: ROLES.INTERN,
    name: "Christian Intern",
    email: "intern@cybervidya.com",
    internId: "I001",
    contactNo: "+91-9000000003",
    education: "B.Tech (Computer Science) at Demo University [2020-2024] 82%",
    certification: "Web Application Basics",
  },
];

async function main() {
  await mongoose.connect(env.mongoUri);

  for (const account of accounts) {
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      console.log(`Skipped existing account: ${account.email}`);
      continue;
    }

    await User.create({
      ...account,
      passwordHash: hashPassword(DEFAULT_PASSWORD),
    });
    console.log(`Created ${account.role}: ${account.email}`);
  }

  console.log(`Default account password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
