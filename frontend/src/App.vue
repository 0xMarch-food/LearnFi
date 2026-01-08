<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- RouterView 是路由视图，会根据当前路径显示对应的页面组件 -->
  <RouterView />
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
}
</style>
