<template>
  <div class="details">
    <h1>Details</h1>
    <b-row>
      <b-col class="left" cols="4">Date</b-col>
      <b-col class="right" cols="8">{{ details.receivedAt }}</b-col>
    </b-row>
    <b-row class="evenRow">
      <b-col class="left" cols="4">From</b-col>
      <b-col class="right" cols="8">{{ details.from }}</b-col>
    </b-row>
    <b-row>
      <b-col class="left" cols="4">Subject</b-col>
      <b-col class="right" cols="8">{{ details.subject }}</b-col>
    </b-row>
    <b-row class="evenRow tags">
      <b-col class="left" cols="4">Tags</b-col>
      <b-col class="right" cols="8">
        <span v-if="details.tags.length > 0">
          <details v-for="(tag, i) in details.tags" :key="i">
            <summary>{{ tag }}</summary>
            <p>{{ keywords[tag].description }}</p>
            <p>
              Includes: <em>{{ keywords[tag].keywords.join(', ') }}</em>
            </p>
          </details>
        </span>
        <span v-else><em>No tags</em></span>
      </b-col>
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
import { Keywords } from '../../../src/types';

interface DetailsProps {
  receivedAt: Date;
  from: string;
  subject: string;
  tags: string[];
  suspicion: number;
  body: string;
}

@Component
export default class Details extends Vue {
  @Prop() readonly details!: DetailsProps;

  @Prop() readonly keywords!: Keywords;
}
</script>

<style lang="stylus" scoped>
*
  overflow-wrap: break-word

h1
  font-size: 30px

.row
  padding-top: 4px
  padding-bottom: 4px

.evenRow
  background: rgba(0, 0, 0, 0.04)

.tags
  p
    margin-bottom: 0px

.left
  text-align: right
</style>
