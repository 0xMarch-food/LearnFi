<template>
  <div class="topic-container">
    <!-- 顶部导航栏 -->
    <div class="topic-header">
      <el-button 
        type="primary" 
        icon="ArrowLeft" 
        @click="goBack"
        class="back-btn"
      >
        返回
      </el-button>
      <h2 class="topic-title">#{{ topicName }}</h2>
    </div>

    <!-- 话题信息卡片 -->
    <el-card class="topic-info-card">
      <div class="topic-stats">
        <div class="stat-item">
          <span class="stat-number">{{ topicStats.posts }}</span>
          <span class="stat-label">帖子</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ topicStats.followers }}</span>
          <span class="stat-label">关注者</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ topicStats.views }}</span>
          <span class="stat-label">浏览</span>
        </div>
      </div>
      
      <el-button 
        type="primary" 
        class="follow-btn"
        :class="{ 'followed': isFollowing }"
        @click="toggleFollow"
      >
        {{ isFollowing ? '已关注' : '关注话题' }}
      </el-button>
    </el-card>

    <!-- 动态列表 -->
    <div class="posts-container">
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
          :max="userBalance"
          :precision="2"
          :step="1"
          placeholder="输入打赏金额"
          class="tip-amount-input"
        />
        <p class="balance-info">当前余额: {{ userBalance }} LF</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="tipDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="confirmTip"
            :loading="tipLoading"
            :disabled="tipAmount <= 0 || tipAmount > userBalance"
          >
            确认打赏
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { LFTokenService } from '@/services/LFTokenService'

// 获取路由和用户状态
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const tokenService = new LFTokenService()

// 响应式数据
const topicName = ref('')
const topicStats = ref({
  posts: 0,
  followers: 0,
  views: 0
})
const isFollowing = ref(false)
const posts = ref([])
const tipDialogVisible = ref(false)
const currentPost = ref(null)
const tipAmount = ref(10)
const tipLoading = ref(false)
const userBalance = ref(0)

// 计算属性：用户钱包地址
const walletAddress = computed(() => userStore.walletAddress)

/**
 * 页面初始化
 */
onMounted(async () => {
  // 获取话题名称
  topicName.value = route.params.topic
  
  // 获取用户余额
  if (walletAddress.value) {
    try {
      userBalance.value = await tokenService.getBalance(walletAddress.value)
    } catch (error) {
      console.error('获取余额失败:', error)
    }
  }
  
  // 加载话题数据
  loadTopicData()
})

/**
 * 加载话题数据
 */
const loadTopicData = async () => {
  // 模拟加载话题统计数据
  topicStats.value = {
    posts: Math.floor(Math.random() * 100) + 50,
    followers: Math.floor(Math.random() * 1000) + 200,
    views: Math.floor(Math.random() * 10000) + 5000
  }
  
  // 模拟是否关注
  isFollowing.value = Math.random() > 0.5
  
  // 模拟加载帖子数据
  posts.value = generateTopicPosts()
}

/**
 * 生成话题相关的帖子数据
 */
const generateTopicPosts = () => {
  const samplePosts = [
    {
      id: 1,
      author: 'CryptoLover',
      content: `关于 ${topicName.value} 的深度分析。这个话题真的很有意思，值得深入探讨。`,
      images: ['https://via.placeholder.com/300x200/409eff/ffffff?text=Image+1'],
      tags: [topicName.value, '区块链', 'DeFi'],
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 50),
      createdAt: new Date(Date.now() - 3600000),
      liked: false,
      loading: { like: false, tip: false }
    },
    {
      id: 2,
      author: 'Web3Enthusiast',
      content: `分享一些关于 ${topicName.value} 的实践经验，希望能帮助到大家！`,
      images: [
        'https://via.placeholder.com/300x200/67c23a/ffffff?text=Image+1',
        'https://via.placeholder.com/300x200/e6a23c/ffffff?text=Image+2'
      ],
      tags: [topicName.value, '经验分享', '教程'],
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 50),
      createdAt: new Date(Date.now() - 7200000),
      liked: false,
      loading: { like: false, tip: false }
    },
    {
      id: 3,
      author: 'DeFiExplorer',
      content: `今天在 ${topicName.value} 领域有了新的发现，记录一下心得体会。`,
      tags: [topicName.value, '心得', '发现'],
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 50),
      createdAt: new Date(Date.now() - 10800000),
      liked: false,
      loading: { like: false, tip: false }
    }
  ]
  
  return samplePosts
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 切换关注状态
 */
const toggleFollow = async () => {
  if (!walletAddress.value) {
    ElMessage.warning('请先连接钱包')
    return
  }
  
  try {
    isFollowing.value = !isFollowing.value
    const action = isFollowing.value ? '关注' : '取消关注'
    ElMessage.success(`${action}${topicName.value} 成功`)
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error('操作失败')
    isFollowing.value = !isFollowing.value // 恢复状态
  }
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
    userBalance.value = await tokenService.getBalance(walletAddress.value)
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
  
  if (tipAmount.value > userBalance.value) {
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
    userBalance.value = await tokenService.getBalance(walletAddress.value)
    
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
</script>

<style scoped>
.topic-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.topic-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px 0;
}

.back-btn {
  margin-right: 15px;
}

.topic-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.topic-info-card {
  margin-bottom: 20px;
}

.topic-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.follow-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
}

.follow-btn.followed {
  background-color: #f0f9ff;
  border-color: #409eff;
  color: #409eff;
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
  .topic-container {
    padding: 10px;
  }
  
  .topic-stats {
    flex-direction: column;
    gap: 15px;
  }
  
  .post-actions {
    flex-direction: column;
  }
  
  .post-actions .el-button {
    width: 100%;
  }
}
</style>