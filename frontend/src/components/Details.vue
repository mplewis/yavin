<template>
  <div class="details">
    <h1>Details</h1>
    <b-row>
      <b-col class="left" cols="4">From</b-col>
      <b-col class="right" cols="8">{{ details.from }}</b-col>
    </b-row>
    <b-row class="evenRow">
      <b-col class="left" cols="4">Subject</b-col>
      <b-col class="right" cols="8">{{ details.subject }}</b-col>
    </b-row>
    <b-row class="tags">
      <b-col class="left" cols="4">Tags</b-col>
      <b-col class="right" cols="8">
        <ul>
          <li v-for="(tag, i) in details.tags" :key="i">
            {{ tag }}
          </li>
        </ul>
      </b-col>
    </b-row>
    <b-row class="evenRow">
      <b-col class="left" cols="4">Suspicion</b-col>
      <b-col class="right" cols="8">{{ details.suspicion }}</b-col>
    </b-row>
    <b-row>
      <b-col class="left" cols="4">Body</b-col>
      <b-col class="right" cols="8">{{ details.body }}</b-col>
    </b-row>
  </div>
</template>

<script lang="ts">
import 'reflect-metadata';
import { Vue, Component, Prop } from 'vue-property-decorator';

interface DetailsProps {
  from: string;
  subject: string;
  tags: string[];
  suspicion: number;
  body: string;
}

@Component
export default class Details extends Vue {
  @Prop() readonly details!: DetailsProps;
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

.tags
  ul
    margin-bottom: 0px
    padding-left: 14px

.left
  text-align: right
</style>
