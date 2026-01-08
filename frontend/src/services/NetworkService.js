/**
 * 网络状态服务
 * 
 * 模拟区块链网络连接状态
 * 在实际项目中，这里会连接真实的区块链节点
 */
export class NetworkService {
  constructor() {
    // 模拟网络状态
    this.networkStatus = {
      connected: false,
      network: 'Unknown',
      chainId: null,
      blockNumber: 0
    }
    
    // 模拟网络类型列表
    this.networks = [
      { name: 'Ethereum Mainnet', chainId: 1, rpcUrl: 'https://mainnet.infura.io' },
      { name: 'Sepolia Testnet', chainId: 11155111, rpcUrl: 'https://sepolia.infura.io' },
      { name: 'Polygon Mainnet', chainId: 137, rpcUrl: 'https://polygon-rpc.com' },
      { name: 'BSC Mainnet', chainId: 56, rpcUrl: 'https://bsc-dataseed.binance.org' }
    ]
  }

  /**
   * 模拟连接到网络
   * @param {string} networkName - 网络名称
   * @returns {Promise<Object>} 连接结果
   */
  async connect(networkName = 'Sepolia Testnet') {
    // 模拟异步连接过程
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const network = this.networks.find(n => n.name === networkName)
    if (!network) {
      throw new Error(`不支持的网络: ${networkName}`)
    }
    
    this.networkStatus = {
      connected: true,
      network: network.name,
      chainId: network.chainId,
      blockNumber: Math.floor(Math.random() * 10000000) + 5000000 // 模拟区块号
    }
    
    return this.networkStatus
  }

  /**
   * 断开网络连接
   */
  disconnect() {
    this.networkStatus = {
      connected: false,
      network: 'Unknown',
      chainId: null,
      blockNumber: 0
    }
  }

  /**
   * 获取当前网络状态
   * @returns {Object} 网络状态信息
   */
  getStatus() {
    return { ...this.networkStatus }
  }

  /**
   * 模拟网络状态变化
   * @param {Function} callback - 状态变化回调函数
   */
  onStatusChange(callback) {
    // 模拟网络状态变化监听
    const interval = setInterval(() => {
      if (this.networkStatus.connected) {
        // 模拟区块号增加
        this.networkStatus.blockNumber += Math.floor(Math.random() * 3)
        callback({ ...this.networkStatus })
      }
    }, 15000) // 每15秒更新一次区块号
    
    return () => clearInterval(interval) // 返回清理函数
  }
}