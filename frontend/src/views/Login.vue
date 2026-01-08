<template>
  <div class="login-container">
    <!-- 登录卡片 -->
    <el-card class="login-card">
      <!-- 标题 -->
      <div class="login-header">
        <h1>LearnFi 钱包登录</h1>
        <p class="subtitle">连接您的加密钱包开始学习之旅</p>
      </div>

      <!-- 登录按钮区域 -->
      <div class="login-buttons">
        <!-- MetaMask 登录按钮 -->
        <el-button 
          class="wallet-btn metamask-btn" 
          size="large" 
          @click="connectMetaMask"
          :loading="loading"
          :disabled="loading"
        >
          <span class="btn-content">
            <span class="wallet-icon">🦊</span>
            <span>MetaMask 登录</span>
          </span>
        </el-button>

        <!-- WalletConnect 登录按钮 -->
        <el-button 
          class="wallet-btn walletconnect-btn" 
          size="large" 
          @click="connectWalletConnect"
          :loading="loading"
          :disabled="loading"
        >
          <span class="btn-content">
            <span class="wallet-icon">📱</span>
            <span>WalletConnect 扫码登录</span>
          </span>
        </el-button>
      </div>

      <!-- 提示信息 -->
      <div class="login-tips">
        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
        >
          <p>• 首次连接需要在钱包中确认授权</p>
          <p>• 我们不会存储您的私钥信息</p>
          <p>• 请确保网络连接正常</p>
        </el-alert>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'
import { mainnet, polygon, arbitrum } from '@wagmi/core/chains'
import { reconnect, getAccount, watchAccount } from '@wagmi/core'

// 获取路由对象，用于页面跳转
const router = useRouter()

// 获取用户状态管理对象
const userStore = useUserStore()

// 加载状态（按钮显示加载动画时为 true）
const loading = ref(false)

// Web3Modal 配置
// projectId 是 WalletConnect 提供的项目标识
// 生产环境需要在 https://cloud.walletconnect.com 注册获取
const projectId = 'YOUR_PROJECT_ID' // 请替换为实际的 Project ID

// 配置支持的区块链网络
const chains = [mainnet, polygon, arbitrum]

// Wagmi 配置对象
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata: {
    name: 'LearnFi',
    description: 'LearnFi Wallet Login',
    url: 'https://learnfi.app',
    icons: ['https://learnfi.app/logo.png']
  }
})

// 创建 Web3Modal 实例（用于 WalletConnect）
const modal = createWeb3Modal({
  wagmiConfig,
  projectId,
  chains
})

/**
 * 连接 MetaMask 钱包
 * 
 * 执行流程：
 * 1. 检查浏览器是否安装了 MetaMask
 * 2. 请求用户授权连接
 * 3. 获取钱包地址
 * 4. 保存到状态管理
 * 5. 跳转到主页
 */
const connectMetaMask = async () => {
  // 开始加载，显示按钮加载动画
  loading.value = true
  
  try {
    // 检查浏览器是否安装了 MetaMask
    // window.ethereum 是 MetaMask 注入到浏览器的对象
    if (!window.ethereum) {
      // 未安装 MetaMask，提示用户
      ElMessage.error('请先安装 MetaMask 钱包插件！')
      loading.value = false
      return
    }

    // 请求连接钱包
    // eth_requestAccounts 会弹出 MetaMask 授权窗口
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    })
    
    // accounts[0] 是用户选择的钱包地址
    const address = accounts[0]
    
    // 验证地址是否有效
    if (!address) {
      ElMessage.error('获取钱包地址失败，请重试！')
      loading.value = false
      return
    }

    // 保存用户信息到全局状态
    userStore.setUserInfo(address, 'MetaMask')
    
    // 显示成功提示
    ElMessage.success('MetaMask 连接成功！')
    
    // 延迟 500ms 后跳转到主页，让用户看到成功提示
    setTimeout(() => {
      router.push('/')
    }, 500)

  } catch (error) {
    // 捕获并处理各种错误
    console.error('MetaMask 连接错误:', error)
    
    // 根据错误代码显示不同的提示信息
    if (error.code === 4001) {
      // 用户拒绝了连接请求
      ElMessage.warning('您拒绝了连接请求')
    } else if (error.code === -32002) {
      // 已经有一个等待中的请求
      ElMessage.warning('请在 MetaMask 中完成之前的请求')
    } else {
      // 其他未知错误
      ElMessage.error('连接失败：' + (error.message || '未知错误'))
    }
  } finally {
    // 无论成功或失败，都要关闭加载状态
    loading.value = false
  }
}

/**
 * 连接 WalletConnect（扫码登录）
 * 
 * 执行流程：
 * 1. 打开 WalletConnect 二维码弹窗
 * 2. 用户用手机钱包扫码
 * 3. 在手机上确认连接
 * 4. 获取钱包地址
 * 5. 保存到状态管理
 * 6. 跳转到主页
 */
const connectWalletConnect = async () => {
  loading.value = true
  
  try {
    // 打开 WalletConnect 连接弹窗（会显示二维码）
    await modal.open()
    
    // 监听账户变化，当用户扫码连接后会触发
    const unwatch = watchAccount(wagmiConfig, {
      onChange(account) {
        if (account.address) {
          // 获取到地址后保存用户信息
          userStore.setUserInfo(account.address, 'WalletConnect')
          
          // 显示成功提示
          ElMessage.success('WalletConnect 连接成功！')
          
          // 停止监听
          unwatch()
          
          // 跳转到主页
          setTimeout(() => {
            router.push('/')
          }, 500)
        }
      }
    })

  } catch (error) {
    console.error('WalletConnect 连接错误:', error)
    
    // 处理网络错误
    if (error.message && error.message.includes('network')) {
      ElMessage.error('网络连接失败，请检查网络后重试')
    } else {
      ElMessage.error('连接失败：' + (error.message || '未知错误'))
    }
  } finally {
    loading.value = false
  }
}

// 组件加载时，尝试重新连接之前的会话
// 如果用户之前连接过，可以自动恢复连接
reconnect(wagmiConfig)
</script>

<style scoped>
/* 登录容器：占满整个屏幕，内容居中 */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 480px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

/* 标题区域 */
.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 28px;
  color: #303133;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 14px;
  color: #909399;
}

/* 按钮区域 */
.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 30px;
}

/* 钱包按钮样式 */
.wallet-btn {
  width: 100%;
  height: 56px;
  font-size: 16px;
  border-radius: 12px;
  transition: all 0.3s;
}

.wallet-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wallet-icon {
  font-size: 24px;
}

/* MetaMask 按钮 */
.metamask-btn {
  background: linear-gradient(135deg, #f6851b 0%, #e2761b 100%);
  color: white;
  border: none;
}

.metamask-btn:hover {
  background: linear-gradient(135deg, #e2761b 0%, #cd6116 100%);
}

/* WalletConnect 按钮 */
.walletconnect-btn {
  background: linear-gradient(135deg, #3b99fc 0%, #2d7dd2 100%);
  color: white;
  border: none;
}

.walletconnect-btn:hover {
  background: linear-gradient(135deg, #2d7dd2 0%, #2566af 100%);
}

/* 提示信息 */
.login-tips {
  margin-top: 20px;
}

.login-tips p {
  margin: 5px 0;
  font-size: 13px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .login-card {
    max-width: 100%;
  }
  
  .login-header h1 {
    font-size: 24px;
  }
  
  .wallet-btn {
    height: 50px;
    font-size: 15px;
  }
  
  .wallet-icon {
    font-size: 20px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .login-container {
    padding: 10px;
  }
  
  .login-card {
    padding: 15px;
  }
  
  .login-header h1 {
    font-size: 20px;
  }
  
  .subtitle {
    font-size: 12px;
  }
  
  .wallet-btn {
    height: 48px;
    font-size: 14px;
  }
}
</style>
