<template>
  <div class="card">
    <p class="line">From: {{from}}</p>
    <p class="line">Subject: {{subject}}</p>
    <span class="tag" v-for="(tag, i) in tags" :key="i">
      {{tag}}
    </span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

@Component
export default class Summary extends Vue {
  from = 'spammer@scamsite.xyz'

  subject = 'FREE corona 4 u'

  tags = [
    'virus',
    'scarewords',
  ]
}
</script>

<style lang="stylus" scoped>
.card
  display: block
  padding: 8px
  margin-bottom: 8px
  border: none
  background: rgba(0, 0, 0, 0.04)
  &:hover
    background: rgba(0, 0, 0, 0.1)

.line
  margin-bottom: 0px

.tag
  display: inline-block
  font-size: 12px
  border-radius: 4px
  background: #666
  color: white
  font-weight: 700
  padding-left: 4px
  padding-right: 4px
  margin-right: 4px
</style>
