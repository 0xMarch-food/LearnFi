# LearnFi 钱包登录配置说明

## 重要提示

### WalletConnect 配置
在使用 WalletConnect 功能之前，需要配置 Project ID：

1. 访问 https://cloud.walletconnect.com
2. 注册并创建新项目
3. 获取 Project ID
4. 在 `src/views/Login.vue` 文件中，找到第 77 行：
   ```javascript
   const projectId = 'YOUR_PROJECT_ID' // 请替换为实际的 Project ID
   ```
5. 将 `YOUR_PROJECT_ID` 替换为你获取的真实 Project ID

### MetaMask 测试
- MetaMask 不需要额外配置
- 确保浏览器已安装 MetaMask 扩展
- 测试网络推荐使用 Sepolia 或 Goerli

## 项目结构
```
src/
├── stores/
│   └── user.js          # 用户状态管理
├── views/
│   ├── Login.vue        # 登录页面
│   └── HomeView.vue     # 主页
├── router/
│   └── index.js         # 路由配置
├── App.vue              # 根组件
└── main.js              # 入口文件
```

## 功能说明
1. ✅ MetaMask 钱包连接
2. ✅ WalletConnect 扫码登录（需配置 Project ID）
3. ✅ 登录状态持久化
4. ✅ 路由守卫自动验证
5. ✅ 错误异常处理
6. ✅ PC/移动端适配
