import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Inbox from '../views/Inbox.vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

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
