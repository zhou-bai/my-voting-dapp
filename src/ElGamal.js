import bigInt from "big-integer";


export class VotingCrypto {
  // 初始化加密参数（默认使用小素数便于演示）
  constructor(p = 7919, g = 2) {
    this.p = bigInt(p);
    this.g = bigInt(g);
  }

  // 生成ElGamal密钥对
  generateKeyPair() {
    const x = bigInt.randBetween(2, this.p.minus(1)); // 私钥（随机数）
    const pk = this.g.modPow(x, this.p); // 公钥 g^x mod p
    return { 
      publicKey: pk.toString(),  // 字符串形式公钥
      privateKey: x.toString()  // 字符串形式私钥
    };
  }

  // 加密投票向量
  encryptVote(mList, publicKey) {
    const pk = bigInt(publicKey);
    return mList.map(m => {
      const r = bigInt.randBetween(1, this.p.minus(1)); // 随机数
      return {
        // c1 = g^r mod p
        c1: this.g.modPow(r, this.p).toString(),
        // c2 = g^m * y^r mod p （y是公钥）
        c2: this.g.modPow(m, this.p)
          .multiply(pk.modPow(r, this.p))
          .mod(this.p).toString()
      };
    });
  }

  // 解密密文（使用离散对数暴力破解，仅适用于小素数）
  decrypt(c1Sum, c2Sum, privateKey) {
    const sk = bigInt(privateKey);
    // 计算分母 y^r = c1^sk mod p
    const denominator = bigInt(c1Sum).modPow(sk, this.p);
    // 计算模逆元：denominator^-1 mod p
    const inverse = denominator.modPow(this.p.minus(2), this.p);
    // 计算 g^m = c2 * inverse mod p
    const gSum = bigInt(c2Sum).multiply(inverse).mod(this.p);
    
    // 暴力搜索离散对数（实际应使用Pohlig-Hellman等算法）
    let accum = bigInt(1);
    for (let i=0; i<1000; i++) {
      if (accum.eq(gSum)) return i;
      accum = accum.multiply(this.g).mod(this.p);
    }
    throw new Error('Result out of range');
  }
}
