import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import HomeView from '../views/HomeView.vue'
import Login from '../views/Login.vue'
import Topic from '../views/Topic.vue'

/**
 * 路由配置
 * 
 * 路由就像一个"地图"，定义了不同的网址对应哪个页面组件
 * 比如：
 * - /login 显示登录页面
 * - / 显示主页
 * - /topic/:topic 显示话题页面
 */
const router = createRouter({
  // 使用 HTML5 History 模式（网址看起来像：/login 而不是 /#/login）
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      // meta 可以存储路由的额外信息
      meta: { requiresAuth: false } // 这个页面不需要登录
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true } // 这个页面需要登录才能访问
    },
    {
      path: '/topic/:topic',
      name: 'topic',
      component: Topic,
      meta: { requiresAuth: true }, // 话题页面也需要登录
      props: true // 将路由参数作为组件 props 传递
    },
    {
      // 捕获所有未匹配的路径，重定向到登录页
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ],
})

/**
 * 全局前置守卫（Navigation Guard）
 * 
 * 想象成一个"门卫"，在用户进入每个页面之前进行检查
 * 执行时机：每次路由跳转之前都会执行
 * 
 * @param {Object} to - 要去的页面信息
 * @param {Object} from - 从哪个页面来
 * @param {Function} next - 放行函数，调用后才能继续跳转
 */
router.beforeEach((to, from, next) => {
  // 获取用户状态管理对象
  const userStore = useUserStore()
  
  // 尝试从本地存储恢复用户登录状态
  // （防止页面刷新后登录状态丢失）
  if (!userStore.isConnected) {
    userStore.restoreUserInfo()
  }
  
  // 判断目标页面是否需要登录
  const requiresAuth = to.meta.requiresAuth
  
  // 判断用户是否已经连接钱包（是否已登录）
  const isConnected = userStore.isConnected
  
  /**
   * 判断逻辑：
   * 1. 如果页面需要登录 && 用户未登录 → 跳转到登录页
   * 2. 如果用户已登录 && 要去登录页 → 跳转到主页（避免重复登录）
   * 3. 其他情况 → 正常放行
   */
  if (requiresAuth && !isConnected) {
    // 需要登录但未登录，跳转到登录页
    next('/login')
  } else if (isConnected && to.path === '/login') {
    // 已登录还要去登录页，直接跳转到主页
    next('/')
  } else {
    // 其他情况正常放行
    next()
  }
})

export default router
