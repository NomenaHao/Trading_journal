import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import { initTheme } from './stores/theme'
import App from './App.vue'
import router from './router'

initTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
