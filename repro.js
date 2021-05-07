const { PrismaClient } = require("@prisma/client");
const uuid = require("uuid");
const assert = require("assert");

const prisma = new PrismaClient();

repro().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function repro() {
  try {
    const account = await generateTestAccount();

    // Simulate an attacker trying to brute force a one time password. We should
    // only give them 5 attempts and then lock the account.
    //
    // In the real world we wouldn’t use the same `account` object, but I’d expect
    // it to behave the same as if we query the account fresh every time.
    const results = await Promise.all([
      attemptOneTimePasswordLogin(account, "XXXX01"),
      attemptOneTimePasswordLogin(account, "XXXX02"),
      attemptOneTimePasswordLogin(account, "XXXX03"),
      attemptOneTimePasswordLogin(account, "XXXX04"),
      attemptOneTimePasswordLogin(account, "XXXX05"),
      attemptOneTimePasswordLogin(account, "XXXX06"),
      attemptOneTimePasswordLogin(account, "XXXX07"),
      attemptOneTimePasswordLogin(account, "XXXX08"),
      attemptOneTimePasswordLogin(account, "XXXX09"),
      attemptOneTimePasswordLogin(account, "XXXX10"),
      attemptOneTimePasswordLogin(account, "XXXX11"),
      attemptOneTimePasswordLogin(account, "XXXX12"),
      attemptOneTimePasswordLogin(account, "XXXX13"),
      attemptOneTimePasswordLogin(account, "XXXX14"),
      attemptOneTimePasswordLogin(account, "XXXX15"),
      attemptOneTimePasswordLogin(account, "XXXX16"),
    ]);

    assert.deepStrictEqual(results.map((result) => result).sort(), [
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      "AccountLocked",
      // Assert that we only got 5 attempts
      "IncorrectOneTimePassword",
      "IncorrectOneTimePassword",
      "IncorrectOneTimePassword",
      "IncorrectOneTimePassword",
      "IncorrectOneTimePassword",
    ]);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateTestAccount() {
  const emailAddress = `test+${uuid.v4()}@example.com`;

  const account = await prisma.account.create({
    data: {
      emailAddress,
    },
  });

  return account;
}

async function attemptOneTimePasswordLogin(account, oneTimePassword) {
  // account.failedOneTimePasswordLoginAttempts might contain outdated
  // information because
  //
  // // Check if the account is locked.
  // if (account.failedOneTimePasswordLoginAttempts >= 5) {
  //   return "AccountLocked";
  // }

  // Normally we use bcrypt to decrypt a 6 digit password. To simplify the test
  // case, compare in plain text to a constant.
  const isCorrectOneTimePassword = oneTimePassword === "000000";

  return updateAccount(account);

  async function updateAccount(account) {
    // Check again whether the account is locked every time we call
    // `updateAccount()` in case it changed concurrently.
    if (account.failedOneTimePasswordLoginAttempts >= 5) {
      return "AccountLocked";
    }

    if (!isCorrectOneTimePassword) {
      const updateAccountResult = await prisma.account.update({
        where: {
          id: account.id,
        },
        data: {
          // Safe to not use the atomic `increment` operator because we won’t
          // update `failedOneTimePasswordLoginAttempts` if it has changed
          // concurrently (see `where` clause).
          failedOneTimePasswordLoginAttempts: {
            increment: 1,
          },
        },
      });
      //
      if (updateAccountResult.failedOneTimePasswordLoginAttempts > 5) {
        return "AccountLocked";
      }

      return "IncorrectOneTimePassword";
    } else {
      // Omitted to simplify the test case.
      throw new Error("Unimplemented");
    }
  }
}
