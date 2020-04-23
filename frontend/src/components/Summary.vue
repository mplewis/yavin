<template>
  <div class="card">
    <p class="line">From: {{brief.from}}</p>
    <p class="line">Subject: {{brief.subject}}</p>
    <div>
      <span class="tag" v-for="(tag, i) in brief.tags" :key="i">
        {{tag}}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

interface SummaryProps {
  from: string;
  subject: string;
  tags: string[];
}

@Component
export default class Summary extends Vue {
  @Prop() brief!: SummaryProps;
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
