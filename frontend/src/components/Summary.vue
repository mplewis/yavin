<template>
  <div :class="{ card: true, selected }" @click="$emit('click')">
    <p class="line">From: {{ brief.from }}</p>
    <p class="line">Subject: {{ brief.subject }}</p>
    <div>
      <span class="tag" v-for="(tag, i) in brief.tags" :key="i">
        {{ tag }}
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
  @Prop() readonly brief!: SummaryProps;

  @Prop() readonly selected!: boolean;
}
</script>

<style lang="stylus" scoped>
light-grey = rgba(0, 0, 0, 0.1)
dark-grey = rgba(0, 0, 0, 0.04)
dark-blue = #2980b9 // Flat UI Colors: Belize Hole

.card
  display: block
  padding: 8px
  margin-bottom: 8px
  border: none
  background: dark-grey
  &:hover
    background: light-grey
  cursor: pointer

.selected
  background: dark-blue
  color: white
  &:hover
    background: dark-blue

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
