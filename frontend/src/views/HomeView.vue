<template>
  <div class="home-container">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">钱包地址:</span>
        <span class="status-value">{{ formatAddress(walletAddress) }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">LF代币余额:</span>
        <span class="status-value balance">{{ balance }} LF</span>
      </div>
      <div class="status-item">
        <span class="status-label">网络状态:</span>
        <span 
          class="status-value" 
          :class="networkStatus.connected ? 'connected' : 'disconnected'"
        >
          <i 
            class="status-indicator" 
            :class="networkStatus.connected ? 'connected' : 'disconnected'"
          ></i>
          {{ networkStatus.network }}
        </span>
      </div>
    </div>

    <!-- ECharts 统计图表 -->
    <el-card class="stats-card">
      <template #header>
        <div class="card-header">
          <span>平台学习时长统计</span>
        </div>
      </template>
      <div class="chart-container" ref="chartRef" />
    </el-card>

    <!-- 社区动态流 -->
    <div class="posts-container">
      <h2 class="section-title">社区动态</h2>
      
      <div 
        v-for="post in posts" 
        :key="post.id" 
        class="post-item"
      >
        <div class="post-header">
          <div class="user-info">
            <div class="avatar" :style="{ backgroundColor: getUserColor(post.author) }">
              {{ post.author.substring(0, 2).toUpperCase() }}
            </div>
            <div class="user-details">
              <div class="username">{{ post.author }}</div>
              <div class="post-time">{{ formatTime(post.createdAt) }}</div>
            </div>
          </div>
        </div>
        
        <div class="post-content">
          <p class="post-text">{{ post.content }}</p>
          
          <!-- 图片展示 -->
          <div v-if="post.images && post.images.length > 0" class="post-images">
            <el-image
              v-for="(image, index) in post.images"
              :key="index"
              :src="image"
              :preview-src-list="post.images"
              :initial-index="index"
              fit="cover"
              class="post-image"
            />
          </div>
          
          <!-- 话题标签 -->
          <div class="post-tags">
            <el-tag
              v-for="tag in post.tags"
              :key="tag"
              type="info"
              size="small"
              class="tag"
              @click="navigateToTopic(tag)"
            >
              #{{ tag }}
            </el-tag>
          </div>
        </div>
        
        <!-- 互动按钮 -->
        <div class="post-actions">
          <el-button 
            :type="post.liked ? 'danger' : 'default'"
            icon="Like"
            @click="toggleLike(post)"
            :loading="post.loading.like"
          >
            {{ post.liked ? '已点赞' : '点赞' }}
            {{ post.likes > 0 ? `(${post.likes})` : '' }}
          </el-button>
          
          <el-button 
            type="default"
            icon="Comment"
            @click="showComments(post)"
          >
            评论 {{ post.comments > 0 ? `(${post.comments})` : '' }}
          </el-button>
          
          <el-button 
            type="warning"
            icon="Coin"
            @click="showTipDialog(post)"
            :loading="post.loading.tip"
          >
            打赏
          </el-button>
        </div>
      </div>

      <!-- 加载更多按钮 -->
      <div class="load-more-container" v-if="hasMore">
        <el-button 
          type="primary" 
          :loading="loadingMore"
          @click="loadMorePosts"
          class="load-more-btn"
        >
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </el-button>
      </div>
    </div>

    <!-- 打赏对话框 -->
    <el-dialog
      v-model="tipDialogVisible"
      title="打赏作者"
      width="400px"
    >
      <div class="tip-dialog-content">
        <p>向 {{ currentPost?.author }} 打赏 LF 代币</p>
        <el-input-number
          v-model="tipAmount"
          :min="1"
          :max="balance"
          :precision="2"
          :step="1"
          placeholder="输入打赏金额"
          class="tip-amount-input"
        />
        <p class="balance-info">当前余额: {{ balance }} LF</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="tipDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="confirmTip"
            :loading="tipLoading"
            :disabled="tipAmount <= 0 || tipAmount > balance"
          >
            确认打赏
          </el-button>
        </span>
      </span>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { LFTokenService } from '@/services/LFTokenService'
import { NetworkService } from '@/services/NetworkService'
import VChart from 'vue-echarts'
import * as echarts from 'echarts'

// 获取用户状态和路由
const router = useRouter()
const userStore = useUserStore()
const tokenService = new LFTokenService()
const networkService = new NetworkService()

// 响应式数据
const walletAddress = computed(() => userStore.walletAddress)
const balance = ref(0)
const networkStatus = ref({
  connected: false,
  network: 'Disconnected',
  chainId: null,
  blockNumber: 0
})
const posts = ref([])
const currentPage = ref(1)
const hasMore = ref(true)
const loadingMore = ref(false)
const tipDialogVisible = ref(false)
const currentPost = ref(null)
const tipAmount = ref(10)
const tipLoading = ref(false)
const chartRef = ref(null)
const chartInstance = ref(null)

// 图表数据
const chartData = ref({
  dates: [],
  hours: []
})

/**
 * 页面初始化
 */
onMounted(async () => {
  // 初始化网络状态
  try {
    await networkService.connect('Sepolia Testnet')
    networkStatus.value = networkService.getStatus()
    
    // 监听网络状态变化
    const unsubscribe = networkService.onStatusChange((status) => {
      networkStatus.value = status
    })
    
    // 组件卸载时清理监听器
    onUnmounted(() => {
      unsubscribe()
    })
  } catch (error) {
    console.error('网络连接失败:', error)
    networkStatus.value = {
      connected: false,
      network: 'Error',
      chainId: null,
      blockNumber: 0
    }
  }
  
  // 获取用户余额
  if (walletAddress.value) {
    try {
      balance.value = await tokenService.getBalance(walletAddress.value)
    } catch (error) {
      console.error('获取余额失败:', error)
      ElMessage.error('获取余额失败')
    }
  }
  
  // 加载初始帖子数据
  loadInitialPosts()
  
  // 初始化图表
  await nextTick()
  initChart()
})

/**
 * 初始化图表
 */
const initChart = () => {
  if (!chartRef.value) return
  
  // 生成测试数据
  generateTestData()
  
  // 创建 ECharts 实例
  chartInstance.value = echarts.init(chartRef.value)
  
  const option = {
    title: {
      text: '平台总学习时长趋势',
      left: 'center',
      textStyle: {
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br />{a}: {c} 小时'
    },
    legend: {
      data: ['学习时长'],
      top: '10%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.value.dates
    },
    yAxis: {
      type: 'value',
      name: '小时'
    },
    series: [{
      name: '学习时长',
      type: 'line',
      data: chartData.value.hours,
      smooth: true,
      lineStyle: {
        color: '#409eff',
        width: 3
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0,
            color: 'rgba(64, 158, 255, 0.3)'
          }, {
            offset: 1,
            color: 'rgba(64, 158, 255, 0.1)'
          }]
        }
      }
    }]
  }
  
  chartInstance.value.setOption(option)
  
  // 响应式处理
  window.addEventListener('resize', () => {
    if (chartInstance.value) {
      chartInstance.value.resize()
    }
  })
}

/**
 * 生成测试图表数据
 */
const generateTestData = () => {
  const dates = []
  const hours = []
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(`${date.getMonth() + 1}-${date.getDate()}`)
    
    // 生成递增的学习时长数据
    const hour = Math.floor(Math.random() * 500) + 1000 + (6 - i) * 100
    hours.push(hour)
  }
  
  chartData.value = { dates, hours }
}

/**
 * 加载初始帖子
 */
const loadInitialPosts = () => {
  // 生成初始帖子数据
  posts.value = generatePosts(10) // 初始加载10条
}

/**
 * 加载更多帖子
 */
const loadMorePosts = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  
  try {
    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 生成更多帖子
    const morePosts = generatePosts(5, posts.value.length + 1)
    posts.value = [...posts.value, ...morePosts]
    
    // 模拟没有更多数据（加载3页后停止）
    if (currentPage.value >= 3) {
      hasMore.value = false
    } else {
      currentPage.value++
    }
    
  } catch (error) {
    console.error('加载更多失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loadingMore.value = false
  }
}

/**
 * 生成帖子数据
 */
const generatePosts = (count, startIndex = 1) => {
  const sampleContents = [
    '今天学习了区块链的基础知识，收获颇丰！#区块链 #学习',
    '分享一下我的DeFi投资心得，希望能帮到大家。#DeFi #投资',
    'Web3技术真的很有趣，正在深入研究中。#Web3 #技术',
    '今天完成了智能合约的编写，感觉很有成就感。#智能合约 #编程',
    'NFT市场最近有什么新动态吗？大家一起讨论一下。#NFT #市场',
    '学习加密货币的历史，了解技术发展脉络。#加密货币 #历史',
    '分享一些Web3安全的小贴士，大家要注意保护资产安全。#安全 #Web3',
    '今天研究了几个有趣的DApp项目，记录一下。#DApp #项目',
    '学习以太坊2.0的升级内容，技术进步真快。#以太坊 #技术',
    '分享我的学习计划，一起进步吧！#学习计划 #目标'
  ]
  
  const sampleImages = [
    'https://via.placeholder.com/300x200/409eff/ffffff?text=LearnFi+1',
    'https://via.placeholder.com/300x200/67c23a/ffffff?text=LearnFi+2',
    'https://via.placeholder.com/300x200/e6a23c/ffffff?text=LearnFi+3',
    'https://via.placeholder.com/300x200/f56c6c/ffffff?text=LearnFi+4',
    'https://via.placeholder.com/300x200/909399/ffffff?text=LearnFi+5'
  ]
  
  const sampleTags = [
    '区块链', 'DeFi', 'Web3', '智能合约', 'NFT', '加密货币',
    '安全', 'DApp', '以太坊', '学习', '技术', '投资'
  ]
  
  const sampleAuthors = [
    'CryptoLover', 'Web3Enthusiast', 'DeFiExplorer', 'BlockchainGuru',
    'SmartContractDev', 'NFTCollector', 'CryptoTrader', 'Web3Builder'
  ]
  
  const newPosts = []
  
  for (let i = 0; i < count; i++) {
    const randomContent = sampleContents[Math.floor(Math.random() * sampleContents.length)]
    const randomImages = Math.random() > 0.5 ? 
      [sampleImages[Math.floor(Math.random() * sampleImages.length)]] : 
      []
    const randomTags = []
    const tagCount = Math.floor(Math.random() * 3) + 1 // 1-3个标签
    for (let j = 0; j < tagCount; j++) {
      const tag = sampleTags[Math.floor(Math.random() * sampleTags.length)]
      if (!randomTags.includes(tag)) {
        randomTags.push(tag)
      }
    }
    
    newPosts.push({
      id: startIndex + i,
      author: sampleAuthors[Math.floor(Math.random() * sampleAuthors.length)],
      content: randomContent,
      images: randomImages,
      tags: randomTags,
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 50),
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7), // 7天内随机时间
      liked: false,
      loading: { like: false, tip: false }
    })
  }
  
  return newPosts
}

/**
 * 点赞/取消点赞
 */
const toggleLike = async (post) => {
  if (!walletAddress.value) {
    ElMessage.warning('请先连接钱包')
    return
  }
  
  try {
    post.loading.like = true
    
    if (post.liked) {
      // 取消点赞
      post.liked = false
      post.likes = Math.max(0, post.likes - 1)
      ElMessage.success('已取消点赞')
    } else {
      // 点赞
      post.liked = true
      post.likes += 1
      ElMessage.success('点赞成功')
    }
  } catch (error) {
    console.error('点赞失败:', error)
    ElMessage.error('点赞失败')
  } finally {
    post.loading.like = false
  }
}

/**
 * 显示评论
 */
const showComments = (post) => {
  ElMessage.info('评论功能正在开发中')
  console.log('显示帖子评论:', post)
}

/**
 * 显示打赏对话框
 */
const showTipDialog = async (post) => {
  if (!walletAddress.value) {
    ElMessage.warning('请先连接钱包')
    return
  }
  
  currentPost.value = post
  tipDialogVisible.value = true
  
  // 重新获取余额
  try {
    balance.value = await tokenService.getBalance(walletAddress.value)
  } catch (error) {
    console.error('获取余额失败:', error)
  }
}

/**
 * 确认打赏
 */
const confirmTip = async () => {
  if (!currentPost.value || !walletAddress.value) {
    ElMessage.warning('请先连接钱包')
    return
  }
  
  if (tipAmount.value <= 0) {
    ElMessage.warning('打赏金额必须大于0')
    return
  }
  
  if (tipAmount.value > balance.value) {
    ElMessage.warning('余额不足')
    return
  }
  
  try {
    tipLoading.value = true
    currentPost.value.loading.tip = true
    
    // 执行代币转账
    const result = await tokenService.transfer(
      walletAddress.value,
      currentPost.value.author,
      tipAmount.value
    )
    
    // 更新用户余额
    balance.value = await tokenService.getBalance(walletAddress.value)
    
    ElMessage.success(`打赏 ${tipAmount.value} LF 成功！`)
    tipDialogVisible.value = false
    tipAmount.value = 10 // 重置金额
    
  } catch (error) {
    console.error('打赏失败:', error)
    ElMessage.error(error.message || '打赏失败')
  } finally {
    tipLoading.value = false
    if (currentPost.value) {
      currentPost.value.loading.tip = false
    }
  }
}

/**
 * 跳转到话题页
 */
const navigateToTopic = (tag) => {
  router.push(`/topic/${tag}`)
}

/**
 * 格式化钱包地址（脱敏显示）
 */
const formatAddress = (address) => {
  if (!address) return '未连接'
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

/**
 * 获取用户头像颜色
 */
const getUserColor = (username) => {
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#c0c4cc']
  const index = username.charCodeAt(0) % colors.length
  return colors[index]
}

/**
 * 格式化时间
 */
const formatTime = (date) => {
  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

// 组件卸载时销毁图表实例
onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose()
  }
})
</script>

<style scoped>
.home-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

/* 顶部状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 12px;
  color: #909399;
}

.status-value {
  font-weight: bold;
  color: #606266;
}

.status-value.balance {
  color: #e6a23c;
  font-size: 14px;
}

.status-value.connected {
  color: #67c23a;
}

.status-value.disconnected {
  color: #f56c6c;
}

.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.status-indicator.connected {
  background-color: #67c23a;
}

.status-indicator.disconnected {
  background-color: #f56c6c;
}

/* 统计卡片 */
.stats-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 400px;
}

/* 社区动态 */
.section-title {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 20px;
}

.posts-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.post-item {
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  margin-right: 10px;
}

.user-details {
  flex: 1;
}

.username {
  font-weight: bold;
  color: #303133;
}

.post-time {
  font-size: 12px;
  color: #909399;
}

.post-content {
  margin-bottom: 10px;
}

.post-text {
  margin: 0 0 10px 0;
  color: #606266;
  line-height: 1.6;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.post-image {
  width: 100%;
  height: 120px;
  border-radius: 4px;
  cursor: pointer;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}

.tag {
  cursor: pointer;
  transition: all 0.3s;
}

.tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.post-actions {
  display: flex;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.load-more-btn {
  width: 200px;
}

/* 打赏对话框 */
.tip-dialog-content {
  text-align: center;
}

.tip-amount-input {
  width: 100%;
  margin: 15px 0;
}

.balance-info {
  color: #909399;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .home-container {
    padding: 10px;
  }
  
  .status-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .status-item {
    justify-content: space-between;
  }
  
  .post-actions {
    flex-direction: column;
  }
  
  .post-actions .el-button {
    width: 100%;
  }
  
  .chart-container {
    height: 300px;
  }
}

@media (max-width: 480px) {
  .post-images {
    grid-template-columns: 1fr;
  }
  
  .status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
