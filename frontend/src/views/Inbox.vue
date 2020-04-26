<template>
  <b-container>
    <b-row>
      <b-navbar>
        <b-navbar-brand href="#">Yavin</b-navbar-brand>
        <b-navbar-toggle target="nav-collapse" />
        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav>
            <b-nav-item>Suspicious</b-nav-item>
            <b-nav-item>Clean</b-nav-item>
            <b-nav-item>To Analyze</b-nav-item>
            <b-nav-item>Everything</b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-navbar>
    </b-row>
    <b-row v-if="messages">
      <b-col cols="4">
        <b-row v-for="(message, i) in messages" :key="i">
          <b-col>
            <Summary
              :brief="message"
              :selected="i === currMessageIndex"
              @click="show(i)"
            />
          </b-col>
        </b-row>
      </b-col>
      <b-col cols="8">
        <Details v-if="message" :details="message" />
        <p v-else>Select a message to view.</p>
      </b-col>
    </b-row>
    <b-row v-else>
      <b-col>
        <h1>Loading...</h1>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
// HACK: Vue can't find the window.fetch type
import { fetch } from 'whatwg-fetch';
import { Vue, Component } from 'vue-property-decorator';
import { EmailResponse } from '../types';
import Summary from '../components/Summary.vue';
import Details from '../components/Details.vue';

const MAX_ATTEMPTS = 3;

async function getEmails(attempt = 1): Promise<EmailResponse[]> {
  if (attempt > MAX_ATTEMPTS) throw new Error('Could not load emails');
  try {
    const resp = await fetch('//localhost:9999/emails');
    const ms: EmailResponse[] = await resp.json();
    return ms;
  } catch (e) {
    console.warn(`getEmails: attempt ${attempt} failed, retrying`);
    console.warn(e);
    return getEmails(attempt + 1);
  }
}

@Component({
  components: { Summary, Details }
})
export default class Inbox extends Vue {
  messages: EmailResponse[] | null = null;

  message: EmailResponse | null = null;

  currMessageIndex: number | null = null;

  async mounted(): Promise<void> {
    this.messages = await getEmails();
  }

  show(i: number): void {
    if (!this.messages) return;
    this.currMessageIndex = i;
    this.message = this.messages[i];
  }
}
</script>

<style lang="stylus">
nav {
  width: 100%;
}
</style>
