import bigInt from "big-integer";
const p = 7919;
const g = 2;
const sk = 5318;
const c1 = 1; // 合约中候选人1的c1
const c2 = 1; // 合约中候选人1的c2

// 计算 g^m = c2 * (c1^sk)^-1 mod p
const denominator = bigInt(c1).modPow(sk, p);
const inverse = denominator.modInv(p);
const g_m = bigInt(c2).multiply(inverse).mod(p);

// 使用BSGS算法求解m
const n = Math.ceil(Math.sqrt(p));
const table = new Map();
let current = bigInt(1);
for (let i = 0; i < n; i++) {
  table.set(current.toString(), i);
  current = current.multiply(g).mod(p);
}

const factor = bigInt(g).modPow(n, p).modInv(p);
current = g_m;
for (let j = 0; j < n; j++) {
  if (table.has(current.toString())) {
    const m = j * n + table.get(current.toString());
    console.log("解密结果:", m); // 应输出实际票数
    break;
  }
  current = current.multiply(factor).mod(p);
}