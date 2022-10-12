import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber, constants, utils } from 'ethers';

import { SimpleVault } from './../types/contracts/SimpleVault';
import { MockERC20 } from './../types/contracts/Mock/MockERC20';

describe('SimpleVault Teset', function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let sandy: SignerWithAddress;
  let sue: SignerWithAddress;

  let asset: MockERC20;
  let vault: SimpleVault;

  beforeEach(async function () {
    [owner, alice, bob, carol, sandy, sue] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory('MockERC20');
    asset = (await MockERC20.deploy()) as MockERC20;
    await asset.connect(alice).mint(utils.parseEther('2000'));
    await asset.connect(bob).mint(utils.parseEther('2000'));
    await asset.connect(carol).mint(utils.parseEther('2000'));
    await asset.connect(sandy).mint(utils.parseEther('3000'));
    await asset.connect(sue).mint(utils.parseEther('3000'));

    const SimpleVault = await ethers.getContractFactory('SimpleVault');
    vault = (await SimpleVault.deploy(asset.address)) as SimpleVault;

    await asset.connect(alice).approve(vault.address, utils.parseEther('2000'));
    await asset.connect(bob).approve(vault.address, utils.parseEther('2000'));
    await asset.connect(carol).approve(vault.address, utils.parseEther('2000'));
    await asset.connect(sandy).approve(vault.address, utils.parseEther('3000'));
    await asset.connect(sue).approve(vault.address, utils.parseEther('3000'));
  });

  describe('#initialize', () => {
    it('check initial values', async function () {
      expect(await vault.asset()).equal(asset.address);
      expect(await vault.depositIndexOf(alice.address)).equal(constants.Zero);
      expect(await vault.depositAmountOf(alice.address)).equal(constants.Zero);

      const topFunders = await vault.topFunders();
      expect(topFunders[0][0]).equal(constants.AddressZero);
      expect(topFunders[0][1]).equal(constants.Zero);
      expect(topFunders[1][0]).equal(constants.AddressZero);
      expect(topFunders[1][1]).equal(constants.Zero);
    });
  });

  describe('#deposit', () => {
    it('zero amount', async function () {
      await expect(
        vault.connect(alice).deposit(constants.Zero)
      ).to.be.revertedWith('SimpleVault: zero amount');
    });

    it('1000e18 deposit', async function () {
      const amount = utils.parseEther('1000');
      const tx = vault.connect(alice).deposit(amount);
      await expect(tx)
        .to.emit(vault, 'Deposited')
        .withArgs(alice.address, amount);

      expect(await asset.balanceOf(alice.address)).equal(amount);
      expect(await asset.balanceOf(vault.address)).equal(amount);

      expect(await vault.depositAmountOf(alice.address)).equal(amount);
      expect(await vault.depositIndexOf(alice.address)).equal(1);

      const userInfo = await vault.deposits(1);
      expect(userInfo[0]).equal(alice.address);
      expect(userInfo[1]).equal(amount);
    });

    it('1000e18 + 1000e18 deposit', async function () {
      const amount = utils.parseEther('1000');
      const totalAmount = amount.add(amount);
      await vault.connect(alice).deposit(amount);
      await vault.connect(alice).deposit(amount);

      expect(await asset.balanceOf(alice.address)).equal(constants.Zero);
      expect(await asset.balanceOf(vault.address)).equal(totalAmount);

      expect(await vault.depositAmountOf(alice.address)).equal(totalAmount);
      expect(await vault.depositIndexOf(alice.address)).equal(1);

      const userInfo = await vault.deposits(1);
      expect(userInfo[0]).equal(alice.address);
      expect(userInfo[1]).equal(totalAmount);
    });

    it('500e18 by bob', async function () {
      const aliceAmount = utils.parseEther('1000');
      const bobAmount = utils.parseEther('500');
      await vault.connect(alice).deposit(aliceAmount);
      await vault.connect(bob).deposit(bobAmount);

      expect(await asset.balanceOf(vault.address)).equal(
        aliceAmount.add(bobAmount)
      );

      expect(await vault.depositAmountOf(alice.address)).equal(aliceAmount);
      expect(await vault.depositIndexOf(alice.address)).equal(1);
      expect(await vault.depositAmountOf(bob.address)).equal(bobAmount);
      expect(await vault.depositIndexOf(bob.address)).equal(2);

      const aliceUserInfo = await vault.deposits(1);
      expect(aliceUserInfo[0]).equal(alice.address);
      expect(aliceUserInfo[1]).equal(aliceAmount);
      const bobUserInfo = await vault.deposits(2);
      expect(bobUserInfo[0]).equal(bob.address);
      expect(bobUserInfo[1]).equal(bobAmount);
    });
  });

  describe('#withdraw', () => {
    const aliceAmount = utils.parseEther('2000');
    const bobAmount = utils.parseEther('1000');
    const carolAmount = utils.parseEther('500');

    beforeEach(async function () {
      await vault.connect(alice).deposit(aliceAmount);
      await vault.connect(bob).deposit(bobAmount);
      await vault.connect(carol).deposit(carolAmount);
    });

    it('zero amount', async function () {
      await expect(
        vault.connect(alice).withdraw(constants.Zero)
      ).to.be.revertedWith('SimpleVault: zero amount');
    });

    it('no deposit', async function () {
      await expect(
        vault.connect(sandy).withdraw(aliceAmount)
      ).to.be.revertedWith('SimpleVault: no deposit');
    });

    it('invalid amount', async function () {
      await expect(vault.connect(bob).withdraw(aliceAmount)).to.be.revertedWith(
        'SimpleVault: invalid amount'
      );
    });

    it('withdraw', async function () {
      const amount = aliceAmount.div(2);
      const tx = vault.connect(alice).withdraw(amount);
      await expect(tx)
        .to.emit(vault, 'Withdrawn')
        .withArgs(alice.address, amount);

      expect(await asset.balanceOf(alice.address)).equal(amount);
      expect(await asset.balanceOf(vault.address)).equal(
        amount.add(bobAmount).add(carolAmount)
      );

      expect(await vault.depositAmountOf(alice.address)).equal(amount);
      expect(await vault.depositIndexOf(alice.address)).equal(1);

      const userInfo = await vault.deposits(1);
      expect(userInfo[0]).equal(alice.address);
      expect(userInfo[1]).equal(amount);
    });

    it('withdraw all', async function () {
      await vault.connect(alice).withdraw(aliceAmount);

      expect(await asset.balanceOf(alice.address)).equal(aliceAmount);
      expect(await asset.balanceOf(vault.address)).equal(
        bobAmount.add(carolAmount)
      );

      expect(await vault.depositAmountOf(alice.address)).equal(constants.Zero);
      expect(await vault.depositIndexOf(alice.address)).equal(0);

      const userInfo = await vault.deposits(1);
      expect(userInfo[0]).equal(carol.address);
      expect(userInfo[1]).equal(carolAmount);
    });
  });

  describe('#topFunders', () => {
    const aliceAmount = utils.parseEther('2000');
    const bobAmount = utils.parseEther('1200');
    const carolAmount = utils.parseEther('1500');
    const sandyAmount = utils.parseEther('2500');
    const sueAmount = utils.parseEther('500');

    beforeEach(async function () {
      await vault.connect(alice).deposit(aliceAmount);
      await vault.connect(bob).deposit(bobAmount);
    });

    it('topFunders in alice/bob', async function () {
      const topFunders = await vault.topFunders();
      expect(topFunders[0][0]).equal(alice.address);
      expect(topFunders[0][1]).equal(aliceAmount);
      expect(topFunders[1][0]).equal(bob.address);
      expect(topFunders[1][1]).equal(bobAmount);
    });

    it('topFunders in alice/bob/carol', async function () {
      await vault.connect(carol).deposit(carolAmount);

      const topFunders = await vault.topFunders();
      expect(topFunders[0][0]).equal(alice.address);
      expect(topFunders[0][1]).equal(aliceAmount);
      expect(topFunders[1][0]).equal(carol.address);
      expect(topFunders[1][1]).equal(carolAmount);
    });

    it('topFunders in bob/carol', async function () {
      await vault.connect(carol).deposit(carolAmount);
      await vault.connect(alice).withdraw(aliceAmount.div(2));

      const topFunders = await vault.topFunders();
      expect(topFunders[0][0]).equal(carol.address);
      expect(topFunders[0][1]).equal(carolAmount);
      expect(topFunders[1][0]).equal(bob.address);
      expect(topFunders[1][1]).equal(bobAmount);
    });

    it('topFunders in alice/bob/carol/sandy/sue', async function () {
      await vault.connect(carol).deposit(carolAmount);
      await vault.connect(sandy).deposit(sandyAmount);
      await vault.connect(sue).deposit(sueAmount);

      const topFunders = await vault.topFunders();
      expect(topFunders[0][0]).equal(sandy.address);
      expect(topFunders[0][1]).equal(sandyAmount);
      expect(topFunders[1][0]).equal(alice.address);
      expect(topFunders[1][1]).equal(aliceAmount);
    });
  });
});
