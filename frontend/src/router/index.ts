import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Inbox from '../views/Inbox.vue';

Vue.use(VueRouter);

const routes: RouteConfig[] = [
  {
    path: '/',
    name: 'Inbox',
    component: Inbox,
  },
];

const router = new VueRouter({ routes });
export default router;
