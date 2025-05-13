# 项目目前基本完善

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## 启动虚拟链，部署智能合约，启动前端

首先进入到 my-voting-dapp 根目录

### `npx hardhat node`

启动 hardhat 虚拟链，本地运行。

### `npm start`

启动前端

## 启动后端

**进入 my-voting-dapp\voting-backend**

### `node server.js`

启动服务

**进入 my-voting-dapp**

### `Invoke-WebRequest -Uri "http://localhost:3001/api/keys/init" -Method Post`

init 进行密钥初始化

### `Invoke-WebRequest -Uri "http://localhost:3001/api/keys/test" -Method Post`

运算测试端口，无需调用
