import Vue from 'vue';
import { BootstrapVue } from 'bootstrap-vue';
import { VNode } from 'vue/types/umd';
import App from './views/App.vue';
import router from './router';
import store from './store';

Vue.config.productionTip = false;

Vue.use(BootstrapVue);

new Vue({
  router,
  store,
  render: (h): VNode => h(App),
}).$mount('#app');
