import bigInt from "big-integer";

export class VotingCrypto {
  // 初始化加密参数
  constructor(p = 7919, g = 2) {
    console.log("初始化加密参数:", { p, g });
    this.p = bigInt(p);
    this.g = bigInt(g);
  }

  // 生成ElGamal密钥对
  generateKeyPair() {
    const x = bigInt.randBetween(2, this.p.minus(1)); // 私钥（随机数）
    const pk = this.g.modPow(x, this.p); // 公钥 g^x mod p
    return {
      publicKey: pk.toString(), // 字符串形式公钥
      privateKey: x.toString(), // 字符串形式私钥
    };
  }

  // 加密投票向量
  encryptVote(mList, publicKey) {
    const pk = bigInt(publicKey);
    return mList.map((m) => {
      const r = bigInt.randBetween(1, this.p.minus(1)); // 随机数
      return {
        // c1 = g^r mod p
        c1: this.g.modPow(r, this.p).toString(),
        // c2 = g^m * y^r mod p （y是公钥）
        c2: this.g
          .modPow(m, this.p)
          .multiply(pk.modPow(r, this.p))
          .mod(this.p)
          .toString(),
      };
    });
  }

  // 解密密文
  //   decrypt(c1Sum, c2Sum, privateKey) {
  //     const sk = bigInt(privateKey);
  //     const denominator = bigInt(c1Sum).modPow(sk, this.p);
  //     const inverse = denominator.modInv(this.p);
  //     const gSum = bigInt(c2Sum).multiply(inverse).mod(this.p);
  //     // 使用BSGS算法求解离散对数
  //     return this._bsgs(this.g, gSum, this.p);
  //   }
  //   // Baby-step Giant-step 离散对数算法
  //   _bsgs(g, h, p) {
  //     const n = p.minus(1); // 群阶p-1
  //     const m = n.sqrt().add(1); // 步长为√n
  //     // 预计算baby steps: g^j -> j
  //     const lookup = new Map();
  //     let babyStep = bigInt(1);
  //     for (let j = 0; j < m; j++) {
  //       lookup.set(babyStep.toString(), j);
  //       babyStep = babyStep.multiply(g).mod(p);
  //     }
  //     // 计算giant step参数
  //     const giantStep = g.modPow(m, p).modInv(p); // g^(-m) mod p
  //     let giantValue = h.mod(p);
  //     // 搜索匹配项
  //     for (let i = 0; i < m; i++) {
  //       if (lookup.has(giantValue.toString())) {
  //         return i * m + lookup.get(giantValue.toString());
  //       }
  //       giantValue = giantValue.multiply(giantStep).mod(p);
  //     }
  //     throw new Error("Discrete logarithm not found");
  //   }
  // }
  // 解密密文
  decrypt(c1Sum, c2Sum, privateKey) {
    const sk = bigInt(privateKey);
    // 计算分母 y^r = c1^sk mod p
    const denominator = bigInt(c1Sum).modPow(sk, this.p);
    // 计算模逆元：denominator^-1 mod p
    const inverse = denominator.modPow(this.p.minus(2), this.p);
    // 计算 g^m = c2 * inverse mod p
    const gSum = bigInt(c2Sum).multiply(inverse).mod(this.p);

    //
    let accum = bigInt(1);
    for (let i = 0; i < 10000; i++) {
      if (accum.eq(gSum)) return i;
      accum = accum.multiply(this.g).mod(this.p);
    }
    throw new Error("Result out of range");
  }
}
