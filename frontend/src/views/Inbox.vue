<template>
  <h1>{{ message }}</h1>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

@Component
export default class Inbox extends Vue {
  message = 'Hello, user!'
}
</script>

<style lang="stylus">

</style>
