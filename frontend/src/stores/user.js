import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 用户状态管理 Store
 * 
 * 这个 Store 就像一个"全局仓库"，用来存储用户的钱包信息
 * 任何页面都可以从这里获取或修改用户数据
 */
export const useUserStore = defineStore('user', () => {
  // ref() 创建一个响应式变量，当它的值改变时，使用它的页面会自动更新
  
  // 存储用户的钱包地址（比如：0x1234...abcd）
  const walletAddress = ref('')
  
  // 存储钱包类型（比如：MetaMask、WalletConnect）
  const walletType = ref('')
  
  // 标记用户是否已登录
  const isConnected = ref(false)

  /**
   * 设置用户信息
   * @param {string} address - 钱包地址
   * @param {string} type - 钱包类型
   * 
   * 当用户成功连接钱包后，调用这个函数保存信息
   */
  const setUserInfo = (address, type) => {
    walletAddress.value = address
    walletType.value = type
    isConnected.value = true
    
    // 将信息保存到浏览器本地存储，刷新页面也不会丢失
    localStorage.setItem('walletAddress', address)
    localStorage.setItem('walletType', type)
  }

  /**
   * 清除用户信息（退出登录）
   * 
   * 当用户断开钱包连接时，清空所有信息
   */
  const clearUserInfo = () => {
    walletAddress.value = ''
    walletType.value = ''
    isConnected.value = false
    
    // 同时清除浏览器本地存储的信息
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('walletType')
  }

  /**
   * 从本地存储恢复用户信息
   * 
   * 当页面刷新时，尝试从浏览器本地存储恢复之前的登录状态
   */
  const restoreUserInfo = () => {
    const savedAddress = localStorage.getItem('walletAddress')
    const savedType = localStorage.getItem('walletType')
    
    if (savedAddress && savedType) {
      walletAddress.value = savedAddress
      walletType.value = savedType
      isConnected.value = true
    }
  }

  // 将这些变量和函数"导出"，让其他文件可以使用
  return {
    walletAddress,      // 钱包地址
    walletType,         // 钱包类型
    isConnected,        // 是否已连接
    setUserInfo,        // 设置用户信息的函数
    clearUserInfo,      // 清除用户信息的函数
    restoreUserInfo     // 恢复用户信息的函数
  }
})
