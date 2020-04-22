<template>
  <div class="details">
    <h1>Details</h1>
    <b-row v-for="(field, i) in fields" :key="i" :class="{ row: true, evenRow: i % 2 === 0 }">
      <b-col class="left" cols="4">{{ field }}</b-col>
      <b-col class="right" cols="8">{{ values[field] }}</b-col>
    </b-row>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

const FIELDS = [
  'from',
  'subject',
  'tags',
  'suspicion',
  'body',
];
const fakeValues: {[k: string]: string} = {};
FIELDS.forEach((field) => {
  fakeValues[field] = `Dummy value for ${field}`;
});

@Component
export default class Details extends Vue {
  fields = FIELDS

  values = fakeValues
}
</script>

<style lang="stylus" scoped>
h1
  font-size: 30px

.row
  padding-top: 4px
  padding-bottom: 4px

.evenRow
  background: rgba(0, 0, 0, 0.04)

.left
  text-align: right
</style>
