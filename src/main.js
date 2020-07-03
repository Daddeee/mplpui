import Vue from "vue";
import vb from "vue-babylonjs";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;
Vue.use(vb);

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");
