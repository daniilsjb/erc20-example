import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

// This is a very small amount of the token, since 1BPT = 1e18. However, the
// precise amount doesn't matter for testing, since we're only interested in
// the effect of the operations upon each account's balance.
const INITIAL_SUPPLY = 10n;

describe("BlokkypayToken", () => {
  async function deployContract() {
    const [owner, other] = await ethers.getSigners();

    const BlokkypayToken = await ethers.getContractFactory("BlokkypayToken");
    const blokkypayToken = await BlokkypayToken.deploy(INITIAL_SUPPLY);

    return { blokkypayToken, owner, other };
  }

  describe("Getters", () => {
    it("should read the name of the token", async () => {
      const { blokkypayToken } = await loadFixture(deployContract);
      expect(await blokkypayToken.name()).to.equal("Blokkypay");
    });

    it("should read the symbol of the token", async () => {
      const { blokkypayToken } = await loadFixture(deployContract);
      expect(await blokkypayToken.symbol()).to.equal("BPT");
    });

    it("should read the decimals of the token", async () => {
      const { blokkypayToken } = await loadFixture(deployContract);
      expect(await blokkypayToken.decimals()).to.equal(18);
    });
  });

  describe("Constructor", () => {
    it("should mint provided amount of total supply", async () => {
      const { blokkypayToken } = await loadFixture(deployContract);
      expect(await blokkypayToken.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("should mint all initial supply to the owner", async () => {
      const { blokkypayToken, owner } = await loadFixture(deployContract);
      expect(await blokkypayToken.balanceOf(owner)).to.equal(INITIAL_SUPPLY);
    });

    it("should leave other accounts with empty balance", async () => {
      const { blokkypayToken, other } = await loadFixture(deployContract);
      expect(await blokkypayToken.balanceOf(other)).to.equal(0);
    });
  });

  describe("Transactions", () => {
    it("should transfer tokens to another address", async () => {
      const { blokkypayToken, owner, other } = await loadFixture(
        deployContract
      );

      const transferAmount = 2n;
      await expect(blokkypayToken.transfer(other, transferAmount))
        .to.emit(blokkypayToken, "Transfer")
        .withArgs(owner.address, other.address, transferAmount);

      expect(await blokkypayToken.balanceOf(owner)).to.equal(8n);
      expect(await blokkypayToken.balanceOf(other)).to.equal(2n);
    });

    it("should transfer tokens from another address", async () => {
      const { blokkypayToken, owner, other } = await loadFixture(
        deployContract
      );

      const oldAllowance = await blokkypayToken.allowance(owner, other);
      expect(oldAllowance).to.be.equal(0);

      const approvedAllowance = 5n;
      await expect(blokkypayToken.approve(other, approvedAllowance))
        .to.emit(blokkypayToken, "Approval")
        .withArgs(owner.address, other.address, approvedAllowance);

      const newAllowance = await blokkypayToken.allowance(owner, other);
      expect(newAllowance).to.be.equal(approvedAllowance);

      const otherRunner = blokkypayToken.connect(other);

      const transferAmount = 3n;
      await expect(otherRunner.transferFrom(owner, other, transferAmount))
        .to.emit(otherRunner, "Transfer")
        .withArgs(owner.address, other.address, transferAmount);

      expect(await blokkypayToken.balanceOf(owner)).to.equal(7n);
      expect(await blokkypayToken.balanceOf(other)).to.equal(3n);

      const finalAllowance = await blokkypayToken.allowance(owner, other);
      expect(finalAllowance).to.be.equal(2n);
    });

    it("should not be possible to transfer tokens with no allowance", async () => {
      const { blokkypayToken, owner, other } = await loadFixture(
        deployContract
      );

      const allowance = await blokkypayToken.allowance(other, owner);
      expect(allowance).to.be.equal(0);

      await expect(
        blokkypayToken.transferFrom(other, owner, 3n)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("should not be possible to exceed allowance when transfering tokens", async () => {
      const { blokkypayToken, owner, other } = await loadFixture(
        deployContract
      );

      const approvedAllowance = 5n;
      await expect(blokkypayToken.approve(other, approvedAllowance))
        .to.emit(blokkypayToken, "Approval")
        .withArgs(owner.address, other.address, approvedAllowance);

      const otherRunner = blokkypayToken.connect(other);
      await expect(
        otherRunner.transferFrom(owner, other, 6n)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });
});
