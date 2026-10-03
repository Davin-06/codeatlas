import { createRouter, createWebHistory } from 'vue-router'
import { useSiteStore, DEFAULT_SITE_NAME } from '../stores/site'
import Home from '../views/Home.vue'
import Knowledge from '../views/Knowledge.vue'
import KnowledgeDetail from '../views/KnowledgeDetail.vue'
import ManageKnowledge from '../views/ManageKnowledge.vue'
import Register from '../views/Register.vue'
import MailSettings from '../views/MailSettings.vue'
import Login from '../views/Login.vue'
import KnowledgeLibrary from '../views/KnowledgeLibrary.vue'
import SharedKnowledgeBase from '../views/SharedKnowledgeBase.vue'
import Notifications from '../views/Notifications.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import AccountSettings from '../views/AccountSettings.vue'
import ExploreLibraries from '../views/ExploreLibraries.vue'
import Favorites from '../views/Favorites.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: Knowledge
  },
  {
    path: '/knowledge/:id',
    name: 'KnowledgeDetail',
    component: KnowledgeDetail,
    props: true
  },
  {
    path: '/manage',
    name: 'ManageKnowledge',
    component: ManageKnowledge
  },
  {
    path: '/manage/mail',
    name: 'MailSettings',
    component: MailSettings
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/library',
    name: 'KnowledgeLibrary',
    component: KnowledgeLibrary,
    meta: { requiresAuth: true }
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: Favorites
  },
  {
    path: '/share/:shareId',
    name: 'SharedKnowledgeBase',
    component: SharedKnowledgeBase
  },
  {
    path: '/explore',
    name: 'ExploreLibraries',
    component: ExploreLibraries
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
    meta: { requiresAuth: true }
  },
  {
    path: '/account',
    name: 'AccountSettings',
    component: AccountSettings,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0, behavior: 'smooth' }
  }
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
})

router.afterEach((to) => {
  // 站点名可能被系统管理员改过，标题要跟着走。
  // 必须在守卫内部取 store —— Pinia 此时才已挂载。
  const siteStore = useSiteStore()
  const siteName = siteStore.siteName || DEFAULT_SITE_NAME
  const titles = {
    Home: `${siteName} · ${siteStore.displayTagline}`,
    Knowledge: `搜索知识 · ${siteName}`,
    KnowledgeDetail: `知识详情 · ${siteName}`,
    ManageKnowledge: `资料维护 · ${siteName}`,
    MailSettings: `验证码邮箱设置 · ${siteName}`,
    Register: `创建账号 · ${siteName}`,
    Login: `登录 · ${siteName}`,
    KnowledgeLibrary: `我的知识库 · ${siteName}`,
    Favorites: `我的收藏 · ${siteName}`,
    SharedKnowledgeBase: `公开知识库 · ${siteName}`,
    Notifications: `消息中心 · ${siteName}`,
    AdminDashboard: `管理中心 · ${siteName}`,
    AccountSettings: `账号设置 · ${siteName}`,
    ExploreLibraries: `共享广场 · ${siteName}`
  }
  document.title = titles[to.name] || siteName
})

export default router
