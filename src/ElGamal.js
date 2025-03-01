import bigInt from "big-integer";


export class VotingCrypto {
  constructor(p = 7919, g = 2) {
    this.p = bigInt(p);
    this.g = bigInt(g);
  }

  generateKeyPair() {
    const x = bigInt.randBetween(2, this.p.minus(1));
    const pk = this.g.modPow(x, this.p);
    return { 
      publicKey: pk.toString(), 
      privateKey: x.toString() 
    };
  }

  encryptVote(mList, publicKey) {
    const pk = bigInt(publicKey);
    return mList.map(m => {
      const r = bigInt.randBetween(1, this.p.minus(1));
      return {
        c1: this.g.modPow(r, this.p).toString(),
        c2: this.g.modPow(m, this.p)
          .multiply(pk.modPow(r, this.p))
          .mod(this.p).toString()
      };
    });
  }

  decrypt(c1Sum, c2Sum, privateKey) {
    const sk = bigInt(privateKey);
    const denominator = bigInt(c1Sum).modPow(sk, this.p);
    const inverse = denominator.modPow(this.p.minus(2), this.p);
    const gSum = bigInt(c2Sum).multiply(inverse).mod(this.p);
    
    let accum = bigInt(1);
    for (let i=0; i<1000; i++) {
      if (accum.eq(gSum)) return i;
      accum = accum.multiply(this.g).mod(this.p);
    }
    throw new Error('Result out of range');
  }
}
