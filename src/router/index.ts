import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/list'
  },
  {
    path: '/tabs',
    component: TabsPage,
    children: [
      { path: '', redirect: 'list' },
      { path: 'list', component: () => import('@/views/EarthquakeList.vue') },
      { path: 'bookmarks', component: () => import('@/views/BookmarksPage.vue') },
    ]
  },
  {
    path: '/detail/:id',
    component: () => import('@/views/EarthquakeDetail.vue'),
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
